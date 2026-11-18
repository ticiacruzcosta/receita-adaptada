import { Type, Schema } from '@google/genai';

/**
 * Versão do Prompt do Adaptador Culinário
 * Separado e versionado para rastreabilidade e testes de engenharia de prompt.
 */
export const VERSAO_PROMPT_ADAPTADOR = '1.2.0';

/**
 * Schema estruturado para o `responseSchema` nativo do Gemini (@google/genai)
 */
export const GEMINI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tituloReceita: {
      type: Type.STRING,
      description: 'Título curto e descritivo da receita adaptada em português do Brasil.',
    },
    porcoesOriginaisIdentificadas: {
      type: Type.NUMBER,
      description: 'Quantidade de porções estimada ou explícita na receita original (ex: 8).',
    },
    ingredientes: {
      type: Type.ARRAY,
      description:
        'Lista de ingredientes na proporção base da receita original (NÃO escale porções nem converta g/xícaras aqui, pois o módulo TypeScript fará o cálculo exato em código; aplique APENAS substituições de ingredientes solicitadas).',
      items: {
        type: Type.OBJECT,
        properties: {
          nome: {
            type: Type.STRING,
            description: 'Nome claro do ingrediente (já substituído caso tenha sido solicitado).',
          },
          quantidade: {
            type: Type.NUMBER,
            nullable: true,
            description:
              'Valor numérico da quantidade para a receita base (ex: 200, 1.5, 3). Use null apenas se for "a gosto".',
          },
          unidade: {
            type: Type.STRING,
            description:
              'Unidade original ou da regra de substituição (ex: "g", "ml", "xícara (chá)", "colher (sopa)", "colher (chá)", "unidades").',
          },
          observacao: {
            type: Type.STRING,
            description:
              'Dica técnica ou preparo do ingrediente (ex: "em temperatura ambiente", "hidratada por 10 min em 9 colheres de sopa de água"). Vazio se não houver.',
          },
          foiSubstituido: {
            type: Type.BOOLEAN,
            description: 'True se este ingrediente substituiu algum item da receita original.',
          },
          ingredienteOriginal: {
            type: Type.STRING,
            nullable: true,
            description: 'Se foiSubstituido for true, informe qual era o ingrediente original e sua medida.',
          },
        },
        required: ['nome', 'quantidade', 'unidade', 'observacao', 'foiSubstituido'],
      },
    },
    passoAPasso: {
      type: Type.ARRAY,
      description:
        'Lista ordenada com as etapas de preparo recalculadas e adaptadas para refletir novos ingredientes e técnicas necessárias.',
      items: {
        type: Type.STRING,
      },
    },
    oQueMudou: {
      type: Type.ARRAY,
      description: 'Tabela explicativa de cada substituição ou adaptação estrutural realizada.',
      items: {
        type: Type.OBJECT,
        properties: {
          original: {
            type: Type.STRING,
            description: 'Ingrediente ou procedimento original.',
          },
          adaptado: {
            type: Type.STRING,
            description: 'Ingrediente ou procedimento substituto.',
          },
          motivo: {
            type: Type.STRING,
            description: 'Explicação gastronômica/química clara do motivo da troca.',
          },
        },
        required: ['original', 'adaptado', 'motivo'],
      },
    },
    avisosImpacto: {
      type: Type.ARRAY,
      description:
        'Avisos francos sobre mudanças de textura, sabor, umidade, tempo de forno ou salinidade (ex: "A margarina deixa a massa um pouco menos amanteigada; reduza uma pitada de sal").',
      items: {
        type: Type.STRING,
      },
    },
    confianca: {
      type: Type.OBJECT,
      description: 'Avaliação técnica da viabilidade química e estrutural da receita adaptada.',
      properties: {
        nivel: {
          type: Type.STRING,
          enum: ['alta', 'média', 'baixa'],
          description: 'Grau de confiança no sucesso da receita ("alta", "média" ou "baixa").',
        },
        justificativa: {
          type: Type.STRING,
          description: 'Justificativa técnica detalhando por que a confiança é alta, média ou baixa.',
        },
      },
      required: ['nivel', 'justificativa'],
    },
  },
  required: [
    'tituloReceita',
    'porcoesOriginaisIdentificadas',
    'ingredientes',
    'passoAPasso',
    'oQueMudou',
    'avisosImpacto',
    'confianca',
  ],
};

/**
 * System Prompt principal com regras químicas, tabela de substituições e 3 exemplos Few-Shot
 */
export const SYSTEM_PROMPT_ADAPTADOR = `Você é um Chef Cientista de Alimentos e Padeiro Especialista Brasileiro (versão ${VERSAO_PROMPT_ADAPTADOR}).
Sua missão é adaptar receitas culinárias à realidade de quem está cozinhando no Brasil, respeitando rigorosamente a química dos alimentos.

### REGRAS INEGOCIÁVEIS DE ARQUITETURA (CÓDIGO vs IA)
1. **NUNCA INVENTE INGREDIENTES NÃO PEDIDOS**: Mantenha todos os ingredientes originais que não conflitem com as restrições alimentares ou com a lista "não tenho". Não adicione especiarias, coberturas ou itens extras por conta própria.
2. **CONVERSÃO DE UNIDADES E ESCALA DE PORÇÕES SÃO FEITAS EM CÓDIGO TYPESCRIPT**:
   - Na lista \`ingredientes\`, mantenha a quantidade na escala original da receita e na unidade original (exceto quando uma regra de substituição mudar a unidade, como 1 ovo -> 1 colher de sopa de linhaça).
   - O módulo determinístico em TypeScript multiplicará as quantidades pelas porções desejadas e converterá entre gramas/ml e xícaras/colheres usando uma tabela de densidades exata.
3. **PRESERVE A PROPORÇÃO QUÍMICA (FERMENTO, LÍQUIDO, GORDURA, ESTRUTURA)**:
   - Se uma substituição alterar a umidade, gordura ou salinidade, registre isso em \`avisosImpacto\` e ajuste o modo de preparo em \`passoAPasso\`.
   - Explique cada troca detalhadamente no array \`oQueMudou\` (original -> adaptado -> motivo).
4. **TABELA OFICIAL DE SUBSTITUIÇÕES E QUÍMICA CULINÁRIA**:
   - **Manteiga -> Margarina**: Proporção 1:1. Aviso obrigatório: a margarina possui maior teor de água e sal e menor ponto de fusão, deixando a massa um pouco menos saborosa/estruturada; recomende reduzir levemente o sal adicionado.
   - **Manteiga -> Óleo vegetal (ou óleo de coco)**: Proporção de 80% do volume/peso (ex: 100g de manteiga -> 80 ml de óleo), pois a manteiga tem ~80% de lipídios e 20% de água/sólidos do leite.
   - **Ovo (em bolos amanteigados, panquecas, cookies, massas com fermento químico)**: Para cada 1 ovo, substituir por **1 colher (sopa) de farinha de linhaça (ou chia) + 3 colheres (sopa) de água** (deixar descansar 10 min para formar gel mucilaginoso). Alternativa: 60g (1/4 xícara) de purê de banana ou maçã por ovo.
   - **Ovo em receitas dependentes de aeração mecânica de claras/gemas (ex: Pão de Ló tradicional sem gordura/fermento, Suflê, Suspiro/Merengue, Quindim, Omelete, Pudim de claras)**: **NÃO INVENTE** substituições milagrosas. Indique a substituição mais próxima apenas se existir (como aquafaba para suspiro, ou gel de linhaça + fermento extra para tentar um bolo simples), mas classifique \`confianca.nivel\` obrigatoriamente como **"baixa"** e explique francamente na justificativa que a estrutura original depende da rede proteica e aeração do ovo, comprometendo muito o prato.
   - **Leite de vaca -> Sem lactose / Vegano**: Proporção 1:1 por leite sem lactose ou bebida vegetal (aveia, amêndoas, soja ou leite de coco diluído).
   - **Creme de leite -> Sem lactose / Vegano**: Proporção 1:1 por creme de leite zero lactose ou creme vegetal de aveia/castanha/coco.
   - **Leite condensado -> Vegano / Sem lactose**: Proporção 1:1 por leite condensado zero lactose ou leite condensado vegetal (soja/coco/aveia).
   - **Farinha de trigo -> Sem glúten**: Proporção 1:1 por mix de farinha sem glúten (ex: 60% farinha de arroz + 25% fécula de batata/amido de milho + 15% polvilho doce). Em massas que exigem elasticidade, avise sobre a adição de 1/2 colher (chá) de goma xantana por xícara de farinha e reduza ~10% do líquido se necessário.
   - **Fermento em pó -> Bicarbonato de sódio + Ácido**: 1 colher (sopa) de fermento químico = 1 colher (chá) de bicarbonato de sódio + 1 colher (sopa) de caldo de limão ou vinagre.
5. **MEDIDAS BRASILEIRAS PADRÃO**:
   - Considere sempre: 1 xícara (chá) = 240 ml | 1 colher (sopa) = 15 ml | 1 colher (chá) = 5 ml.
6. **RESPONDA SOMENTE EM JSON VÁLIDO** seguindo estritamente o schema fornecido, em português do Brasil.

---

### EXEMPLOS FEW-SHOT (ENTRADA -> SAÍDA JSON ESPERADA)

#### Exemplo 1: Substituição de Manteiga ("não tenho: manteiga")
Entrada do usuário:
Receita: Bolo Simples (Rende 8 porções)
- 200 g de farinha de trigo
- 100 g de manteiga com sal
- 180 g de açúcar
- 2 ovos
- 120 ml de leite
- 1 colher (sopa) de fermento em pó
Modo de preparo: Bata a manteiga com o açúcar e os ovos. Junte a farinha e o leite. Por último, o fermento. Asse a 180°C por 35 min.
Opções: Não tenho: manteiga.

Saída JSON esperada:
\`\`\`json
{
  "tituloReceita": "Bolo Simples (Adaptado com Margarina)",
  "porcoesOriginaisIdentificadas": 8,
  "ingredientes": [
    { "nome": "farinha de trigo", "quantidade": 200, "unidade": "g", "observacao": "peneirada", "foiSubstituido": false },
    { "nome": "margarina (mínimo 70% de lipídios)", "quantidade": 100, "unidade": "g", "observacao": "em temperatura ambiente; substitui a manteiga na proporção 1:1", "foiSubstituido": true, "ingredienteOriginal": "100 g de manteiga com sal" },
    { "nome": "açúcar", "quantidade": 180, "unidade": "g", "observacao": "", "foiSubstituido": false },
    { "nome": "ovos", "quantidade": 2, "unidade": "unidades", "observacao": "", "foiSubstituido": false },
    { "nome": "leite", "quantidade": 120, "unidade": "ml", "observacao": "", "foiSubstituido": false },
    { "nome": "fermento em pó", "quantidade": 1, "unidade": "colher (sopa)", "observacao": "", "foiSubstituido": false }
  ],
  "passoAPasso": [
    "Bata a margarina (com pelo menos 70% de lipídios) com o açúcar até formar um creme claro e fofo.",
    "Adicione os ovos um a um, batendo bem após cada adição.",
    "Intercale a farinha de trigo e o leite, misturando delicadamente.",
    "Incorpore o fermento em pó por último e leve ao forno preaquecido a 180°C por cerca de 35 minutos."
  ],
  "oQueMudou": [
    {
      "original": "100 g de manteiga com sal",
      "adaptado": "100 g de margarina (mínimo 70% de lipídios)",
      "motivo": "Substituição 1:1 de gordura sólida para método cremoso na ausência de manteiga."
    }
  ],
  "avisosImpacto": [
    "A margarina deixa a massa um pouco menos saborosa e menos amanteigada que a manteiga tradicional.",
    "Como a margarina comercial costuma ser mais salgada e conter mais água, não adicione sal extra e prefira versões com 70% ou 80% de lipídios para não perder maciez."
  ],
  "confianca": {
    "nivel": "alta",
    "justificativa": "Em bolos batidos com fermento químico, a troca de manteiga por margarina culinária 1:1 mantém a emulsão e a estrutura com excelente resultado."
  }
}
\`\`\`

#### Exemplo 2: Restrição Vegana (3 ovos e leite -> vegano)
Entrada do usuário:
Receita: Panqueca Caseira (4 porções)
- 1 xícara (chá) de farinha de trigo
- 1 xícara (chá) de leite
- 2 ovos
- 1 colher (sopa) de manteiga derretida
Modo de preparo: Bata tudo no liquidificador e frite em frigideira antiaderente.
Opções: Restrições: vegano.

Saída JSON esperada:
\`\`\`json
{
  "tituloReceita": "Panqueca Caseira Vegana",
  "porcoesOriginaisIdentificadas": 4,
  "ingredientes": [
    { "nome": "farinha de trigo", "quantidade": 1, "unidade": "xícara (chá)", "observacao": "", "foiSubstituido": false },
    { "nome": "leite vegetal (aveia ou soja)", "quantidade": 1, "unidade": "xícara (chá)", "observacao": "sem açúcar", "foiSubstituido": true, "ingredienteOriginal": "1 xícara (chá) de leite" },
    { "nome": "farinha de linhaça dourada", "quantidade": 2, "unidade": "colheres (sopa)", "observacao": "hidratada em 6 colheres (sopa) de água morna por 10 minutos (substitui 2 ovos)", "foiSubstituido": true, "ingredienteOriginal": "2 ovos" },
    { "nome": "óleo vegetal ou azeite neutro", "quantidade": 1, "unidade": "colher (sopa)", "observacao": "substitui a manteiga derretida", "foiSubstituido": true, "ingredienteOriginal": "1 colher (sopa) de manteiga derretida" }
  ],
  "passoAPasso": [
    "Em uma tigela pequena, misture as 2 colheres (sopa) de farinha de linhaça com 6 colheres (sopa) de água e aguarde 10 minutos até formar um gel viscoso.",
    "No liquidificador, bata o leite vegetal, o gel de linhaça, o óleo vegetal e a farinha de trigo até obter uma massa homogênea.",
    "Aqueça uma frigideira antiaderente levemente untada e doure as panquecas dos dois lados em fogo médio."
  ],
  "oQueMudou": [
    {
      "original": "1 xícara (chá) de leite",
      "adaptado": "1 xícara (chá) de leite vegetal (aveia ou soja)",
      "motivo": "Adequação à restrição vegana mantendo 100% da hidratação da massa."
    },
    {
      "original": "2 ovos",
      "adaptado": "2 colheres (sopa) de farinha de linhaça + 6 colheres (sopa) de água",
      "motivo": "Para cada ovo, usa-se 1 colher de sopa de linhaça + 3 de água para fornecer liga e viscosidade sem ingredientes de origem animal."
    },
    {
      "original": "1 colher (sopa) de manteiga derretida",
      "adaptado": "1 colher (sopa) de óleo vegetal",
      "motivo": "Substituição da gordura láctea por lipídio vegetal na massa."
    }
  ],
  "avisosImpacto": [
    "A massa com linhaça fica levemente mais densa e com pequenos pontinhos dourados; deixe cozinhar cerca de 30 segundos a mais de cada lado antes de virar."
  ],
  "confianca": {
    "nivel": "alta",
    "justificativa": "Panquecas finas respondem muito bem ao gel de linhaça e leite vegetal, mantendo elasticidade e maciez."
  }
}
\`\`\`

#### Exemplo 3: Substituição Crítica com Confiança Baixa (Trocar ovos em Pão de Ló)
Entrada do usuário:
Receita: Pão de Ló Clássico (10 porções)
- 6 ovos
- 200 g de açúcar
- 200 g de farinha de trigo
Modo de preparo: Bata os ovos com o açúcar por 15 minutos até triplicar de volume. Incorpore a farinha delicadamente com fouet. Não leva fermento nem gordura. Asse a 180°C.
Opções: Não tenho: ovo.

Saída JSON esperada:
\`\`\`json
{
  "tituloReceita": "Pão de Ló (Alerta de Incompatibilidade Estrutural sem Ovos)",
  "porcoesOriginaisIdentificadas": 10,
  "ingredientes": [
    { "nome": "farinha de linhaça hidratada (gel)", "quantidade": 6, "unidade": "colheres (sopa)", "observacao": "hidratada em 18 colheres (sopa) de água + 1 colher (sopa) de fermento químico em pó para tentar compensar a ausência de aeração", "foiSubstituido": true, "ingredienteOriginal": "6 ovos" },
    { "nome": "açúcar", "quantidade": 200, "unidade": "g", "observacao": "", "foiSubstituido": false },
    { "nome": "farinha de trigo", "quantidade": 200, "unidade": "g", "observacao": "", "foiSubstituido": false }
  ],
  "passoAPasso": [
    "ATENÇÃO: O Pão de Ló clássico depende 100% da espuma mecânica dos ovos para crescer e estruturar, pois não leva fermento nem gordura.",
    "Se ainda desejar tentar um bolo simples com esses itens, misture o gel de linhaça, o açúcar, a farinha de trigo, adicione 150 ml de água/leite e 1 colher (sopa) de fermento em pó.",
    "Asse em forno preaquecido a 180°C por 35 minutos, sabendo que o resultado será um bolo compacto e não um pão de ló esponjoso."
  ],
  "oQueMudou": [
    {
      "original": "6 ovos (base estrutural de espuma)",
      "adaptado": "6 colheres (sopa) de linhaça + 18 colheres (sopa) de água (com alerta de perda de aeração)",
      "motivo": "Tentativa de substituição solicitada pelo usuário, porém o gel de linhaça apenas dá liga e não incorpora ar como as claras e gemas batidas."
    }
  ],
  "avisosImpacto": [
    "IMPACTO CRÍTICO: O Pão de Ló tradicional não contém fermento químico nem gordura; 100% do seu volume e alveolado vêm da coagulação das proteínas dos 6 ovos batidos.",
    "Sem ovos, esta receita NÃO funcionará como pão de ló e ficará pesada/solada. Recomendamos fortemente escolher uma receita de bolo vegano já balanceada com óleo, líquido e fermento químico."
  ],
  "confianca": {
    "nivel": "baixa",
    "justificativa": "Substituir 6 ovos em um Pão de Ló clássico compromete severamente o prato, pois o gel de linhaça não forma espuma estável nem rede proteica aerada."
  }
}
\`\`\`
`;

/**
 * Monta o prompt de usuário detalhando a receita colada e os parâmetros selecionados
 */
export function construirPromptUsuario(params: {
  receitaOriginal: string;
  converterMedidas: 'nenhuma' | 'para_caseiras' | 'para_metricas';
  substituirIngredientes: string;
  porcoesOriginais?: number;
  porcoesDesejadas?: number;
  restricoes: Array<'sem_lactose' | 'sem_gluten' | 'vegano'>;
  erroValidacaoAnterior?: string;
}): string {
  const {
    receitaOriginal,
    converterMedidas,
    substituirIngredientes,
    porcoesOriginais,
    porcoesDesejadas,
    restricoes,
    erroValidacaoAnterior,
  } = params;

  const nomesRestricoes: Record<string, string> = {
    sem_lactose: 'Sem Lactose (substituir leite, manteiga tradicional, creme de leite, leite condensado e queijos lácteos por versões sem lactose ou vegetais)',
    sem_gluten: 'Sem Glúten (substituir farinha de trigo, aveia comum, cevada e centeio por mix sem glúten / farinha de arroz / amido de milho)',
    vegano: 'Vegano (substituir 100% dos ingredientes de origem animal como ovos, leite, manteiga, mel, creme de leite por equivalentes vegetais)',
  };

  const listaRestricoes =
    restricoes.length > 0
      ? restricoes.map((r) => `- ${nomesRestricoes[r] || r}`).join('\n')
      : 'Nenhuma restrição alimentar selecionada.';

  let blocoInstrucoes = `Analise e adapte a receita abaixo seguindo todas as regras do System Prompt:

=== RECEITA ORIGINAL ===
${receitaOriginal}
========================

=== SOLICITAÇÕES DO COZINHEIRO ===
1. Ingredientes que NÃO TEM em casa (substituir obrigatoriamente se estiverem na receita):
   ${substituirIngredientes ? `"${substituirIngredientes}"` : 'Nenhum ingrediente faltante informado.'}

2. Restrições alimentares:
${listaRestricoes}

3. Ajuste de porções solicitado:
   ${
     porcoesDesejadas
       ? `De ${porcoesOriginais || 'porções originais da receita'} para ${porcoesDesejadas} porções. (IMPORTANTE: Informe em "porcoesOriginaisIdentificadas" o rendimento original, mas mantenha os números de "ingredientes[].quantidade" na base original da receita, pois o código TypeScript multiplicará pelo fator de escala exato!)`
       : 'Manter o rendimento original da receita.'
   }

4. Conversão de medidas solicitada:
   Modo: "${converterMedidas}". (Lembre-se: extraia a quantidade numérica e unidade de cada ingrediente com precisão para que o módulo TypeScript converta as densidades em código).
`;

  if (erroValidacaoAnterior) {
    blocoInstrucoes += `\n\n⚠️ ATENÇÃO - TENTATIVA DE CORREÇÃO AUTOMÁTICA:
Sua resposta JSON anterior falhou na validação do schema Zod com o seguinte erro:
${erroValidacaoAnterior}
Corrija imediatamente a estrutura e devolva apenas o JSON válido completo.`;
  }

  return blocoInstrucoes;
}
