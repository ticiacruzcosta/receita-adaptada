import { GoogleGenAI } from '@google/genai';
import {
  AdaptarEntrada,
  RespostaAdaptada,
  RespostaAdaptadaSchema,
  RespostaIA,
  RespostaIASchema,
  IngredienteAdaptado,
  ItemMudanca,
} from './schemas';
import {
  processarMatematicaIngrediente,
  calcularRecomendacaoFormaEForno,
} from './conversor';
import {
  SYSTEM_PROMPT_ADAPTADOR,
  GEMINI_RESPONSE_SCHEMA,
  construirPromptUsuario,
} from '../prompts/adaptador';

const MODELO_GEMINI = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Chama o Gemini com Structured Output (`responseSchema`) e valida com Zod.
 * Se o JSON vier inválido segundo o Zod, tenta novamente 1 vez enviando a mensagem de erro detalhada.
 */
async function obterAnaliseEstruturadaIA(
  entrada: AdaptarEntrada,
  apiKey: string
): Promise<RespostaIA> {
  const ai = new GoogleGenAI({ apiKey });

  let ultimoErroValidacao: string | undefined = undefined;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const promptUsuario = construirPromptUsuario({
      ...entrada,
      erroValidacaoAnterior: ultimoErroValidacao,
    });

    const response = await ai.models.generateContent({
      model: MODELO_GEMINI,
      contents: promptUsuario,
      config: {
        systemInstruction: SYSTEM_PROMPT_ADAPTADOR,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const textoBruto = response.text;
    if (!textoBruto) {
      ultimoErroValidacao = 'A resposta do modelo veio vazia.';
      if (tentativa === 2) {
        throw new Error(`Falha ao obter JSON válido da IA após 2 tentativas: ${ultimoErroValidacao}`);
      }
      continue;
    }

    let jsonParseado: unknown;
    try {
      jsonParseado = JSON.parse(textoBruto);
    } catch (err: any) {
      ultimoErroValidacao = `Erro de sintaxe JSON (JSON.parse): ${err?.message || String(err)}`;
      if (tentativa === 2) {
        throw new Error(`O modelo retornou um JSON malformado mesmo após nova tentativa: ${ultimoErroValidacao}`);
      }
      continue;
    }

    const validacaoZod = RespostaIASchema.safeParse(jsonParseado);
    if (validacaoZod.success) {
      return validacaoZod.data;
    }

    ultimoErroValidacao = validacaoZod.error.issues
      .map((i) => `Campo "${i.path.join('.')}": ${i.message}`)
      .join('; ');

    if (tentativa === 2) {
      throw new Error(
        `O JSON retornado pela IA não passou na validação Zod após nova tentativa: ${ultimoErroValidacao}`
      );
    }
  }

  throw new Error('Erro inesperado no fluxo de chamada da IA.');
}

/**
 * Motor Heurístico Local (Fallback Inteligente determinístico):
 * Aplica as mesmas regras químicas do System Prompt quando sem GEMINI_API_KEY ou durante os testes automatizados.
 */
export function analisarReceitaComMotorRegrasLocal(entrada: AdaptarEntrada): RespostaIA {
  const texto = entrada.receitaOriginal;
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let tituloReceita = 'Receita Adaptada';
  if (linhas.length > 0 && linhas[0].length < 80 && !/^\d/.test(linhas[0])) {
    tituloReceita = linhas[0].replace(/^#+\s*/, '').replace(/:$/, '');
  }

  const matchPorcoes = texto.match(/(\d+)\s*(porç(?:ões|ao|oes)|pessoas|fatias|unidades)/i);
  const porcoesOriginaisIdentificadas =
    entrada.porcoesOriginais || (matchPorcoes ? Number(matchPorcoes[1]) : 4);

  const naoTenhoLista = (entrada.substituirIngredientes || '')
    .toLowerCase()
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const querSemLactose =
    entrada.restricoes.includes('sem_lactose') ||
    entrada.restricoes.includes('vegano') ||
    naoTenhoLista.some((i) => i.includes('leite') || i.includes('lactose'));

  const querVegano = entrada.restricoes.includes('vegano');
  const querSemGluten =
    entrada.restricoes.includes('sem_gluten') ||
    naoTenhoLista.some((i) => i.includes('farinha de trigo') || i.includes('glúten') || i.includes('gluten'));

  const semManteiga =
    querVegano ||
    entrada.restricoes.includes('sem_lactose') ||
    naoTenhoLista.some((i) => i.includes('manteiga'));

  const semOvo =
    querVegano || naoTenhoLista.some((i) => i.includes('ovo') || i.includes('ovos'));

  const semFermento = naoTenhoLista.some((i) => i.includes('fermento'));
  const semAcucar = naoTenhoLista.some((i) => i.includes('açúcar') || i.includes('acucar'));
  const semCremeDeLeite =
    querVegano ||
    entrada.restricoes.includes('sem_lactose') ||
    naoTenhoLista.some((i) => i.includes('creme de leite'));
  const semLeiteCondensado =
    querVegano ||
    entrada.restricoes.includes('sem_lactose') ||
    naoTenhoLista.some((i) => i.includes('leite condensado'));

  const ehReceitaDependenteDeEspumaDeOvo =
    /pão de ló|pao de lo|suflê|sufle|suspiro|merengue|quindim|omelete|claras em neve/i.test(texto) &&
    !/fermento|óleo|oleo|manteiga/i.test(texto);

  const ingredientesExtraidos: RespostaIA['ingredientes'] = [];
  const passoAPassoExtraido: string[] = [];
  const oQueMudou: ItemMudanca[] = [];
  const avisosImpacto: string[] = [];

  const regexLinhaIngrediente =
    /^[-•*]?\s*(\d+(?:[.,]\d+)?(?:\s*e\s*\d+\/\d+|\s+\d+\/\d+)?|\d+\/\d+)\s*(g|gr|gramas?|kg|ml|l|litros?|xícaras?(?:\s*\(?chá\)?)?|xicaras?(?:\s*\(?cha\)?)?|colher(?:es)?\s*(?:de\s*)?\(?sopa\)?|colher(?:es)?\s*(?:de\s*)?\(?chá\)?|colher(?:es)?\s*(?:de\s*)?\(?cha\)?|cs|cc|unidades?|ovos?|latas?|caixinhas?|pitadas?|dentes?)?\s*(?:de\s+)?(.+)$/i;

  let emModoPreparo = false;

  for (const linha of linhas) {
    if (/^(modo de preparo|preparo|instruções|passo a passo)/i.test(linha)) {
      emModoPreparo = true;
      continue;
    }
    if (/^(ingredientes)/i.test(linha)) {
      emModoPreparo = false;
      continue;
    }

    const match = !emModoPreparo ? linha.match(regexLinhaIngrediente) : null;
    if (match) {
      const qtdTexto = match[1].trim();
      const unidadeBruta = (match[2] || '').trim();
      let nomeBruto = match[3].trim();

      let qtdNumerica = parseQuantidadeTexto(qtdTexto);
      let unidade = unidadeBruta || 'unidades';

      if (/^ovos?$/i.test(unidadeBruta) && nomeBruto) {
        nomeBruto = `${unidadeBruta} ${nomeBruto}`;
        unidade = 'unidades';
      } else if (!unidadeBruta && /^ovos?\b/i.test(nomeBruto)) {
        unidade = 'unidades';
      }

      const originalDesc = `${qtdTexto} ${unidadeBruta ? unidadeBruta + ' de ' : ''}${nomeBruto}`.replace(
        /\s+/g,
        ' '
      );

      const nomeLower = nomeBruto.toLowerCase();

      if (nomeLower.includes('manteiga') && semManteiga) {
        const substituto = querVegano
          ? 'margarina vegetal sem leite (80% lipídios) ou óleo de coco'
          : 'margarina culinária (mínimo 70% de lipídios)';
        ingredientesExtraidos.push({
          nome: substituto,
          quantidade: qtdNumerica,
          unidade,
          observacao: 'substituição 1:1 da manteiga; reduza a adição de sal na receita',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de ${substituto}`,
          motivo: querVegano
            ? 'Substituição da gordura láctea animal por gordura vegetal na proporção 1:1.'
            : 'Substituição 1:1 da manteiga por margarina mantendo a função de lipídio na massa.',
        });
        avisosImpacto.push(
          'A margarina deixa a massa um pouco menos saborosa/amanteigada e costuma conter mais sal e água; reduza uma pitada de sal da receita.'
        );
      } else if (/\bovos?\b/i.test(nomeLower) && semOvo) {
        const numOvos = qtdNumerica || 1;
        const colheresLinhaca = numOvos * 1;
        const colheresAgua = numOvos * 3;
        ingredientesExtraidos.push({
          nome: 'farinha de linhaça dourada (gel substitutivo de ovo)',
          quantidade: colheresLinhaca,
          unidade: colheresLinhaca > 1 ? 'colheres (sopa)' : 'colher (sopa)',
          observacao: `hidratada em ${colheresAgua} colheres (sopa) de água morna por 10 min (1 cs linhaça + 3 cs água para cada ovo)`,
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${colheresLinhaca} colher(es) de sopa de linhaça + ${colheresAgua} colher(es) de sopa de água`,
          motivo:
            'Substituição vegana/sem ovo clássica (1 colher de sopa de linhaça + 3 de água por ovo) para garantir emulsão e liga.',
        });
        if (ehReceitaDependenteDeEspumaDeOvo) {
          avisosImpacto.push(
            'ALERTA CRÍTICO: Esta receita depende da aeração mecânica dos ovos (como em Pão de Ló/Suflê). O gel de linhaça dá liga, mas NÃO incorpora ar; a massa ficará densa e compacta.'
          );
        } else {
          avisosImpacto.push(
            'O gel de linhaça mantém a umidade e a estrutura da massa, deixando a textura levemente mais macia e com suaves pontinhos de fibra.'
          );
        }
      } else if (nomeLower.includes('leite condensado') && semLeiteCondensado) {
        const sub = querVegano ? 'leite condensado vegetal (de aveia, soja ou coco)' : 'leite condensado zero lactose';
        ingredientesExtraidos.push({
          nome: sub,
          quantidade: qtdNumerica,
          unidade,
          observacao: 'mesma proporção (1:1)',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de ${sub}`,
          motivo: 'Substituição direta para atender à restrição de lactose/veganismo mantendo dulçor e viscosidade.',
        });
      } else if (nomeLower.includes('creme de leite') && semCremeDeLeite) {
        const sub = querVegano ? 'creme culinário vegetal (de aveia ou castanha)' : 'creme de leite zero lactose';
        ingredientesExtraidos.push({
          nome: sub,
          quantidade: qtdNumerica,
          unidade,
          observacao: 'proporção 1:1',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de ${sub}`,
          motivo: 'Mantém o teor de gordura e cremosidade sem lactose/origem animal.',
        });
      } else if (nomeLower.includes('leite') && !nomeLower.includes('coco') && querSemLactose) {
        const sub = querVegano ? 'leite vegetal (aveia, amêndoas ou soja)' : 'leite sem lactose (ou bebida vegetal)';
        ingredientesExtraidos.push({
          nome: sub,
          quantidade: qtdNumerica,
          unidade,
          observacao: 'proporção 1:1 em temperatura ambiente',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de ${sub}`,
          motivo: 'Substituição líquida 1:1 livre de lactose preservando a hidratação da receita.',
        });
      } else if ((nomeLower.includes('farinha de trigo') || nomeLower === 'farinha') && querSemGluten) {
        const sub = 'mix de farinha sem glúten (60% farinha de arroz, 25% amido de milho, 15% polvilho doce)';
        ingredientesExtraidos.push({
          nome: sub,
          quantidade: qtdNumerica,
          unidade,
          observacao: 'adicione 1/2 colher (chá) de goma xantana para elasticidade se necessário',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de ${sub}`,
          motivo: 'Substituição isenta de glúten equilibrando estrutura (arroz) e leveza (amido/polvilho).',
        });
        avisosImpacto.push(
          'Farinhas sem glúten absorvem líquidos de forma diferente; pode ser necessário reduzir cerca de 10% do líquido ou deixar a massa descansar 10 minutos antes de assar.'
        );
      } else if (nomeLower.includes('fermento') && semFermento) {
        ingredientesExtraidos.push({
          nome: 'bicarbonato de sódio + caldo de limão (ou vinagre)',
          quantidade: qtdNumerica,
          unidade: 'colher (chá)',
          observacao: 'use 1 colher (chá) de bicarbonato + 1 colher (sopa) de suco de limão para cada colher (sopa) de fermento',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: 'Bicarbonato de sódio ativado com meio ácido (limão ou vinagre)',
          motivo: 'Reação ácido-base libera gás carbônico (CO2) substituindo o fermento químico tradicional.',
        });
        avisosImpacto.push(
          'O bicarbonato reage imediatamente em contato com o ácido; leve a massa ao forno assim que misturar.'
        );
      } else if ((nomeLower.includes('açúcar') || nomeLower.includes('acucar')) && semAcucar) {
        ingredientesExtraidos.push({
          nome: 'adoçante culinário forno e fogão (xilitol ou eritritol)',
          quantidade: qtdNumerica,
          unidade,
          observacao: 'proporção 1:1',
          foiSubstituido: true,
          ingredienteOriginal: originalDesc,
        });
        oQueMudou.push({
          original: originalDesc,
          adaptado: `${qtdTexto} ${unidade} de adoçante culinário (xilitol/eritritol)`,
          motivo: 'Substituição solicitada para ausência de açúcar mantendo volume de sólidos secos.',
        });
        avisosImpacto.push(
          'Sem açúcar sacarose, a reação de caramelização (Maillard) é menor e o bolo ficará mais claro.'
        );
      } else {
        ingredientesExtraidos.push({
          nome: nomeBruto,
          quantidade: qtdNumerica,
          unidade,
          observacao: '',
          foiSubstituido: false,
        });
      }
    } else if (linha !== tituloReceita) {
      passoAPassoExtraido.push(linha.replace(/^\d+[.) -]+/, '').trim());
    }
  }

  if (ingredientesExtraidos.length === 0) {
    ingredientesExtraidos.push({
      nome: 'Ingrediente principal da receita',
      quantidade: 1,
      unidade: 'porção',
      observacao: 'Extraído do texto livre',
      foiSubstituido: false,
    });
  }

  if (passoAPassoExtraido.length === 0) {
    passoAPassoExtraido.push(
      'Separe e meça todos os ingredientes conforme a lista adaptada.',
      'Misture os ingredientes líquidos e as gorduras primeiro, incorporando os secos delicadamente em seguida.',
      'Finalize o cozimento ou forneamento conforme o tempo habitual da receita.'
    );
  }

  if (semOvo) {
    passoAPassoExtraido.unshift(
      'Prepare antes o substituto do ovo: hidrate a farinha de linhaça na água morna indicada por 10 minutos até formar um gel homogêneo.'
    );
  }

  let nivelConfianca: 'alta' | 'média' | 'baixa' = 'alta';
  let justificativaConfianca =
    'As adaptações respeitam a proporção química de gorduras, líquidos e agentes estruturais da receita original.';

  if (ehReceitaDependenteDeEspumaDeOvo && semOvo) {
    nivelConfianca = 'baixa';
    justificativaConfianca =
      'Substituir ovos em receitas estruturadas exclusivamente por espuma de claras/gemas (como Pão de Ló tradicional, suflê ou suspiro) compromete severamente a aeração e o volume do prato.';
  } else if (oQueMudou.length >= 3 || (querSemGluten && semOvo)) {
    nivelConfianca = 'média';
    justificativaConfianca =
      'Como múltiplos agentes estruturais (glúten e/ou ovos/laticínios) foram substituídos simultaneamente, a textura final será funcional e saborosa, porém levemente diferente da receita clássica.';
  }

  return {
    tituloReceita,
    porcoesOriginaisIdentificadas,
    ingredientes: ingredientesExtraidos,
    passoAPasso: passoAPassoExtraido,
    oQueMudou,
    avisosImpacto,
    confianca: {
      nivel: nivelConfianca,
      justificativa: justificativaConfianca,
    },
  };
}

function parseQuantidadeTexto(texto: string): number {
  const limpo = texto.trim().replace(',', '.');
  if (limpo.includes(' e ')) {
    const partes = limpo.split(' e ');
    return Number(partes[0]) + parseFracao(partes[1]);
  }
  if (limpo.includes(' ')) {
    const partes = limpo.split(/\s+/);
    return Number(partes[0]) + parseFracao(partes[1]);
  }
  if (limpo.includes('/')) {
    return parseFracao(limpo);
  }
  const n = Number(limpo);
  return Number.isNaN(n) ? 1 : n;
}

function parseFracao(frac: string): number {
  const [num, den] = frac.split('/').map(Number);
  if (!den) return num || 1;
  return num / den;
}

/**
 * Pipeline completo de Adaptação de Receita:
 * 1. Valida entrada com Zod
 * 2. Obtém análise de ingredientes e substituições (via Gemini Structured Output + retry, ou fallback local)
 * 3. Executa TODAS as conversões de densidades/unidades, cálculo de porções, forma e Airfryer em CÓDIGO TypeScript (`src/conversor.ts`)
 * 4. Valida a saída final com `RespostaAdaptadaSchema` (Zod)
 */
export async function adaptarReceita(
  entradaBruta: AdaptarEntrada,
  opcoes?: { permitirFallbackSemChave?: boolean; apiKeyOverride?: string }
): Promise<RespostaAdaptada> {
  const entrada = entradaBruta;
  const apiKey = (opcoes?.apiKeyOverride || process.env.GEMINI_API_KEY || '').trim();

  let respostaIA: RespostaIA;
  let usouFallbackLocal = false;

  if (apiKey) {
    respostaIA = await obterAnaliseEstruturadaIA(entrada, apiKey);
  } else if (opcoes?.permitirFallbackSemChave) {
    respostaIA = analisarReceitaComMotorRegrasLocal(entrada);
    usouFallbackLocal = true;
  } else {
    throw new Error(
      'Chave GEMINI_API_KEY não configurada. Clique em "Configurar Gemini API" no topo da página ou defina no arquivo .env.'
    );
  }

  const porcoesOriginais =
    entrada.porcoesOriginais || respostaIA.porcoesOriginaisIdentificadas || 4;
  const porcoesFinais = entrada.porcoesDesejadas || porcoesOriginais;
  const fatorEscala = porcoesFinais / porcoesOriginais;

  let itensCalculadosEmCodigo = 0;
  const mudancasFinais: ItemMudanca[] = [...respostaIA.oQueMudou];
  const avisosFinais: string[] = [...respostaIA.avisosImpacto];

  if (Math.abs(fatorEscala - 1) > 0.001) {
    mudancasFinais.push({
      original: `Rendimento para ${porcoesOriginais} porções`,
      adaptado: `Rendimento recalculado para ${porcoesFinais} porções (fator ${Number(fatorEscala.toFixed(2))}x)`,
      motivo: 'Ajuste proporcional exato calculado em código TypeScript sobre todos os ingredientes.',
    });

    if (fatorEscala >= 1.8) {
      avisosFinais.push(
        `Como a receita foi ampliada em ${Number(fatorEscala.toFixed(1))}x, use uma forma maior (ou duas formas) e evite dobrar o fermento cegamente se a massa passar de 2x: acima do dobro, reduza ~10% do fermento para o bolo não crescer rápido demais e murchar no centro.`
      );
    } else if (fatorEscala <= 0.6) {
      avisosFinais.push(
        'Porções reduzidas assam mais rápido: verifique o ponto do forno cerca de 8 a 10 minutos antes do tempo original.'
      );
    }
  }

  // Calcula recomendação técnica de forma/assadeira e conversão para Airfryer em código TypeScript
  const recomendacaoTecnica = calcularRecomendacaoFormaEForno({
    textoOriginal: entrada.receitaOriginal,
    porcoesFinais,
    fatorEscala,
    adaptarParaAirfryer: Boolean(entrada.adaptarParaAirfryer),
  });

  if (entrada.adaptarParaAirfryer && recomendacaoTecnica.modoAirfryer) {
    mudancasFinais.push({
      original: 'Forno convencional (padrão da receita)',
      adaptado: `Airfryer a ${recomendacaoTecnica.modoAirfryer.temperaturaAirfryerC}°C por ~${recomendacaoTecnica.modoAirfryer.tempoAirfryerMin} min`,
      motivo: 'Conversão térmica em código TypeScript (−20°C na temperatura e −22% no tempo para convecção acelerada da Airfryer).',
    });
    avisosFinais.push(recomendacaoTecnica.modoAirfryer.resumo);
  }

  // Processa cada ingrediente no módulo de conversão determinística em TypeScript
  const ingredientesAdaptados: IngredienteAdaptado[] = respostaIA.ingredientes.map((ing) => {
    const resultadoMatematico = processarMatematicaIngrediente({
      nome: ing.nome,
      quantidade: ing.quantidade,
      unidade: ing.unidade,
      fatorEscala,
      modoConversao: entrada.converterMedidas,
    });

    if (resultadoMatematico.calculadoEmCodigo) {
      itensCalculadosEmCodigo++;
    }

    if (resultadoMatematico.detalheMudanca) {
      mudancasFinais.push(resultadoMatematico.detalheMudanca);
    }

    return {
      nome: ing.nome,
      quantidade: resultadoMatematico.quantidade,
      unidade: resultadoMatematico.unidade,
      quantidadeFormatada: resultadoMatematico.quantidadeFormatada,
      observacao: ing.observacao || '',
      foiSubstituido: ing.foiSubstituido,
      ingredienteOriginal: ing.ingredienteOriginal,
    };
  });

  if (avisosFinais.length === 0) {
    avisosFinais.push(
      'Nenhuma alteração crítica na estrutura química da receita. Siga as medidas convertidas com precisão.'
    );
  }

  const respostaFinal: RespostaAdaptada = {
    tituloReceita: respostaIA.tituloReceita,
    porcoesOriginais,
    porcoesFinais,
    fatorEscala: Number(fatorEscala.toFixed(2)),
    ingredientesAdaptados,
    passoAPasso: respostaIA.passoAPasso,
    oQueMudou: mudancasFinais,
    avisosImpacto: avisosFinais,
    confianca: respostaIA.confianca,
    recomendacaoTecnica,
    metadadosConversao: {
      conversaoAplicada: entrada.converterMedidas,
      itensCalculadosEmCodigo,
      usouFallbackLocal,
      motorUtilizado: usouFallbackLocal ? 'regras_local' : 'gemini_api',
    },
  };

  return RespostaAdaptadaSchema.parse(respostaFinal);
}
