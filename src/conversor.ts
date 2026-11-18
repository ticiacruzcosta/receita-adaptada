/**
 * Módulo de Conversão Culinária Determinística (Medidas Brasileiras)
 *
 * Referências Oficiais Brasileiras:
 * - 1 xícara de chá padrão = 240 ml
 * - 1 colher de sopa (cs) = 15 ml
 * - 1 colher de chá (cc) = 5 ml
 *
 * A IA identifica os ingredientes e unidades, mas TODA a matemática de escala de porções
 * e conversão entre massa (g/kg), volume métrico (ml/l) e medidas caseiras (xícaras/colheres)
 * é executada neste módulo em TypeScript puro para evitar erros de cálculo do modelo.
 */

export interface DadosDensidade {
  nomeCanonica: string;
  termos: string[];
  gramasPorXicara: number; // peso de 1 xícara (240 ml) em gramas
  ehLiquido: boolean; // se true, conversão métrica preferencial é ml; se false, g
}

/**
 * Tabela de densidades culinárias brasileiras (gramas por xícara de 240 ml)
 */
export const TABELA_DENSIDADES: DadosDensidade[] = [
  {
    nomeCanonica: 'farinha de trigo',
    termos: ['farinha de trigo', 'farinha', 'trigo', 'farinha sem gluten', 'farinha sem glúten', 'mix de farinha'],
    gramasPorXicara: 120, // 1 xícara = 120g | 1 cs = 7.5g
    ehLiquido: false,
  },
  {
    nomeCanonica: 'farinha de arroz',
    termos: ['farinha de arroz'],
    gramasPorXicara: 150,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'farinha de aveia',
    termos: ['farinha de aveia', 'aveia em flocos', 'aveia'],
    gramasPorXicara: 90,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'amido de milho',
    termos: ['amido de milho', 'maizena', 'maisena', 'polvilho doce', 'polvilho azedo', 'fécula de batata'],
    gramasPorXicara: 150,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'açúcar refinado',
    termos: ['açúcar refinado', 'acucar refinado', 'açúcar', 'acucar', 'açúcar cristal', 'açúcar demerara'],
    gramasPorXicara: 180, // 1 xícara = 180g | 1 cs = 11.25g
    ehLiquido: false,
  },
  {
    nomeCanonica: 'açúcar mascavo',
    termos: ['açúcar mascavo', 'acucar mascavo'],
    gramasPorXicara: 150,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'açúcar de confeiteiro',
    termos: ['açúcar de confeiteiro', 'acucar de confeiteiro', 'glaçúcar'],
    gramasPorXicara: 140,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'manteiga ou margarina',
    termos: ['manteiga', 'margarina', 'manteiga vegana', 'manteiga sem sal', 'manteiga com sal', 'ghee', 'gordura vegetal'],
    gramasPorXicara: 200, // 1 xícara = 200g | 1 cs = 12.5g (~12-13g)
    ehLiquido: false,
  },
  {
    nomeCanonica: 'chocolate em pó / cacau',
    termos: ['chocolate em pó', 'chocolate em po', 'cacau em pó', 'cacau', 'achocolatado', 'nescau', 'toddy'],
    gramasPorXicara: 90,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'fermento químico em pó',
    termos: ['fermento em pó', 'fermento químico', 'fermento quimico', 'fermento para bolo', 'bicarbonato de sódio', 'bicarbonato'],
    gramasPorXicara: 192, // 1 colher de sopa (15ml) = ~12g; 1 colher de chá (5ml) = ~4g
    ehLiquido: false,
  },
  {
    nomeCanonica: 'sal',
    termos: ['sal', 'sal refinado', 'sal marinho', 'flor de sal'],
    gramasPorXicara: 288, // 1 colher de sopa = 18g; 1 colher de chá = 6g
    ehLiquido: false,
  },
  {
    nomeCanonica: 'coco ralado',
    termos: ['coco ralado'],
    gramasPorXicara: 80,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'queijo ralado',
    termos: ['queijo ralado', 'parmesão ralado'],
    gramasPorXicara: 100,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'cenoura picada/ralada',
    termos: ['cenoura ralada', 'cenoura picada', 'cenoura em rodelas'],
    gramasPorXicara: 130,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'leite e líquidos aquosos',
    termos: [
      'leite',
      'leite integral',
      'leite sem lactose',
      'leite vegetal',
      'leite de aveia',
      'leite de amêndoas',
      'leite de coco',
      'água',
      'agua',
      'suco',
      'caldo',
      'café',
      'vinagre',
      'essência de baunilha',
      'extrato de baunilha',
    ],
    gramasPorXicara: 240, // 240 ml = 240 g
    ehLiquido: true,
  },
  {
    nomeCanonica: 'óleo ou azeite',
    termos: ['óleo', 'oleo', 'óleo vegetal', 'óleo de milho', 'óleo de girassol', 'óleo de coco', 'azeite'],
    gramasPorXicara: 216, // densidade ~0.9 g/ml -> 240 ml = 216g (mas em métrica líquida, 1 xícara = 240 ml)
    ehLiquido: true,
  },
  {
    nomeCanonica: 'creme de leite / iogurte',
    termos: ['creme de leite', 'iogurte', 'creme vegetal', 'requeijão'],
    gramasPorXicara: 240,
    ehLiquido: true,
  },
  {
    nomeCanonica: 'leite condensado',
    termos: ['leite condensado', 'leite condensado vegano', 'leite condensado sem lactose'],
    gramasPorXicara: 300,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'mel / melado',
    termos: ['mel', 'melado', 'glucose', 'xarope'],
    gramasPorXicara: 320,
    ehLiquido: false,
  },
  {
    nomeCanonica: 'linhaça / chia',
    termos: ['linhaça', 'farinha de linhaça', 'semente de linhaça', 'chia', 'gel de linhaça'],
    gramasPorXicara: 144, // 1 colher de sopa (15ml) = ~9g
    ehLiquido: false,
  },
];

export const MEDIDAS_BR = {
  XICARA_ML: 240,
  COLHER_SOPA_ML: 15,
  COLHER_CHA_ML: 5,
};

/**
 * Busca a densidade de um ingrediente pelo nome.
 * Caso não encontre na tabela, retorna um fallback padrão (ex: 240g/xícara se parecer líquido, ou 150g/xícara para sólido).
 */
export function buscarDensidade(nomeIngrediente: string): DadosDensidade {
  const normalizado = nomeIngrediente.toLowerCase().trim();

  for (const item of TABELA_DENSIDADES) {
    for (const termo of item.termos) {
      if (normalizado.includes(termo)) {
        return item;
      }
    }
  }

  const pareceLiquido =
    normalizado.includes('líquido') ||
    normalizado.includes('calda') ||
    normalizado.includes('molho') ||
    normalizado.includes('extrato');

  return {
    nomeCanonica: 'padrão',
    termos: [],
    gramasPorXicara: pareceLiquido ? 240 : 150,
    ehLiquido: pareceLiquido,
  };
}

export type TipoUnidade =
  | 'grama'
  | 'quilograma'
  | 'mililitro'
  | 'litro'
  | 'xicara'
  | 'colher_sopa'
  | 'colher_cha'
  | 'unidade_discreta'; // ex: unidade, ovo, lata, pitada

/**
 * Identifica o tipo canônico da unidade informada
 */
export function classificarUnidade(unidade: string): TipoUnidade {
  const u = unidade.toLowerCase().trim();

  if (u === 'g' || u === 'gr' || u === 'grama' || u === 'gramas') return 'grama';
  if (u === 'kg' || u === 'quilo' || u === 'quilos' || u === 'quilograma' || u === 'quilogramas') return 'quilograma';
  if (u === 'ml' || u === 'mililitro' || u === 'mililitros') return 'mililitro';
  if (u === 'l' || u === 'litro' || u === 'litros') return 'litro';

  if (u.includes('xícara') || u.includes('xicara') || u === 'xíc' || u === 'xic') return 'xicara';
  if (
    u.includes('sopa') ||
    u === 'cs' ||
    u === 'c.s.' ||
    u === 'colher de sopa' ||
    u === 'colheres de sopa'
  ) {
    return 'colher_sopa';
  }
  if (
    u.includes('chá') ||
    u.includes('cha') ||
    u.includes('café') ||
    u.includes('cafe') ||
    u === 'cc' ||
    u === 'c.c.' ||
    u === 'colher de chá' ||
    u === 'colheres de chá'
  ) {
    return 'colher_cha';
  }

  return 'unidade_discreta';
}

/**
 * Formata um número decimal de xícaras/colheres em frações culinárias brasileiras amigáveis
 * Ex: 1.5 -> "1 e 1/2", 0.25 -> "1/4", 0.33 -> "1/3", 2 -> "2"
 */
export function formatarFracaoCulinaria(valor: number): string {
  if (valor <= 0) return '0';

  const inteiro = Math.floor(valor + 0.04); // tolerância para arredondamento próximo de inteiro
  const resto = valor - Math.floor(valor);

  if (Math.abs(valor - Math.round(valor)) < 0.08) {
    return String(Math.round(valor));
  }

  const fracoes: Array<{ dec: number; texto: string }> = [
    { dec: 0.25, texto: '1/4' },
    { dec: 1 / 3, texto: '1/3' },
    { dec: 0.5, texto: '1/2' },
    { dec: 2 / 3, texto: '2/3' },
    { dec: 0.75, texto: '3/4' },
  ];

  let melhorFracao = '';
  let menorDiferenca = Infinity;

  for (const f of fracoes) {
    const dif = Math.abs(resto - f.dec);
    if (dif < menorDiferenca) {
      menorDiferenca = dif;
      melhorFracao = f.texto;
    }
  }

  const baseInteira = Math.floor(valor);
  if (menorDiferenca <= 0.1) {
    if (baseInteira === 0) return melhorFracao;
    return `${baseInteira} e ${melhorFracao}`;
  }

  // Caso não encaixe bem em fração comum, arredonda para 1 casa decimal com vírgula
  return valor.toFixed(1).replace('.', ',').replace(',0', '');
}

/**
 * Converte um volume equivalente em mililitros (base xícara 240 ml) para a medida caseira mais adequada:
 * - Volumes >= 60 ml (1/4 de xícara): expressos em xícaras (ou xícara + colher de sopa se necessário)
 * - Volumes entre 10 ml e 59 ml: expressos em colheres de sopa (15 ml)
 * - Volumes < 10 ml: expressos em colheres de chá (5 ml)
 */
export function volumeMlParaMedidaCaseira(mlEquivalente: number): {
  quantidade: number;
  unidade: string;
  quantidadeFormatada: string;
} {
  if (mlEquivalente >= 60) {
    const xicaras = mlEquivalente / MEDIDAS_BR.XICARA_ML;
    const xicarasArredondadas = Math.round(xicaras * 12) / 12; // múltiplos de 1/4 ou 1/3
    const textoQtd = formatarFracaoCulinaria(xicarasArredondadas);
    const plural = xicarasArredondadas > 1.05;
    const un = plural ? 'xícaras (chá)' : 'xícara (chá)';
    return {
      quantidade: Number(xicarasArredondadas.toFixed(2)),
      unidade: un,
      quantidadeFormatada: `${textoQtd} ${un}`,
    };
  }

  if (mlEquivalente >= 10) {
    const colheresSopa = mlEquivalente / MEDIDAS_BR.COLHER_SOPA_ML;
    const csArredondada = Math.round(colheresSopa * 2) / 2; // meia colher de precisão
    const textoQtd = formatarFracaoCulinaria(csArredondada);
    const plural = csArredondada > 1.05;
    const un = plural ? 'colheres (sopa)' : 'colher (sopa)';
    return {
      quantidade: Number(csArredondada.toFixed(2)),
      unidade: un,
      quantidadeFormatada: `${textoQtd} ${un}`,
    };
  }

  const colheresCha = Math.max(0.25, mlEquivalente / MEDIDAS_BR.COLHER_CHA_ML);
  const ccArredondada = Math.round(colheresCha * 2) / 2;
  const textoQtd = formatarFracaoCulinaria(ccArredondada);
  const plural = ccArredondada > 1.05;
  const un = plural ? 'colheres (chá)' : 'colher (chá)';
  return {
    quantidade: Number(ccArredondada.toFixed(2)),
    unidade: un,
    quantidadeFormatada: `${textoQtd} ${un}`,
  };
}

export interface ResultadoConversaoIngrediente {
  quantidade: number | null;
  unidade: string;
  quantidadeFormatada: string;
  calculadoEmCodigo: boolean;
  detalheMudanca?: {
    original: string;
    adaptado: string;
    motivo: string;
  };
}

/**
 * Executa em CÓDIGO TypeScript:
 * 1) Escalonamento de porções (multiplicação exata pelo fatorEscala)
 * 2) Conversão de medidas (g/ml <-> xícaras/colheres de sopa/chá) usando a TABELA_DENSIDADES
 */
export function processarMatematicaIngrediente(params: {
  nome: string;
  quantidade: number | null;
  unidade: string;
  fatorEscala: number;
  modoConversao: 'nenhuma' | 'para_caseiras' | 'para_metricas';
}): ResultadoConversaoIngrediente {
  const { nome, quantidade, unidade, fatorEscala, modoConversao } = params;

  if (quantidade === null || quantidade === 0) {
    return {
      quantidade,
      unidade,
      quantidadeFormatada: unidade ? `a gosto (${unidade})` : 'a gosto',
      calculadoEmCodigo: false,
    };
  }

  const qtdEscalada = quantidade * fatorEscala;
  const tipoUnidade = classificarUnidade(unidade);
  const densidade = buscarDensidade(nome);

  const textoOriginalAntesConversao = `${formatarNumeroSimples(qtdEscalada)} ${unidade}`.trim();

  // Caso 1: Converter de Métricas (g, kg, ml, l) -> Caseiras (xícaras, colheres)
  if (
    modoConversao === 'para_caseiras' &&
    (tipoUnidade === 'grama' ||
      tipoUnidade === 'quilograma' ||
      tipoUnidade === 'mililitro' ||
      tipoUnidade === 'litro')
  ) {
    let mlEquivalente = 0;

    if (tipoUnidade === 'grama' || tipoUnidade === 'quilograma') {
      const gramas = tipoUnidade === 'quilograma' ? qtdEscalada * 1000 : qtdEscalada;
      // 1 xícara (240 ml) pesa `densidade.gramasPorXicara` gramas
      mlEquivalente = (gramas / densidade.gramasPorXicara) * MEDIDAS_BR.XICARA_ML;
    } else {
      mlEquivalente = tipoUnidade === 'litro' ? qtdEscalada * 1000 : qtdEscalada;
    }

    const convertido = volumeMlParaMedidaCaseira(mlEquivalente);
    return {
      quantidade: convertido.quantidade,
      unidade: convertido.unidade,
      quantidadeFormatada: convertido.quantidadeFormatada,
      calculadoEmCodigo: true,
      detalheMudanca: {
        original: `${textoOriginalAntesConversao} de ${nome}`,
        adaptado: `${convertido.quantidadeFormatada} de ${nome}`,
        motivo: `Conversão em código (densidade: 1 xícara de 240 ml = ${densidade.gramasPorXicara}g para ${densidade.nomeCanonica})`,
      },
    };
  }

  // Caso 2: Converter de Caseiras (xícaras, colheres de sopa/chá) -> Métricas (g ou ml)
  if (
    modoConversao === 'para_metricas' &&
    (tipoUnidade === 'xicara' || tipoUnidade === 'colher_sopa' || tipoUnidade === 'colher_cha')
  ) {
    let volumeMl = 0;
    if (tipoUnidade === 'xicara') volumeMl = qtdEscalada * MEDIDAS_BR.XICARA_ML;
    if (tipoUnidade === 'colher_sopa') volumeMl = qtdEscalada * MEDIDAS_BR.COLHER_SOPA_ML;
    if (tipoUnidade === 'colher_cha') volumeMl = qtdEscalada * MEDIDAS_BR.COLHER_CHA_ML;

    if (densidade.ehLiquido) {
      const mlArredondado = Math.round(volumeMl);
      return {
        quantidade: mlArredondado,
        unidade: 'ml',
        quantidadeFormatada: `${mlArredondado} ml`,
        calculadoEmCodigo: true,
        detalheMudanca: {
          original: `${formatarFracaoCulinaria(qtdEscalada)} ${unidade} de ${nome}`,
          adaptado: `${mlArredondado} ml de ${nome}`,
          motivo: `Conversão volumétrica brasileira em código (xícara = 240 ml, sopa = 15 ml, chá = 5 ml)`,
        },
      };
    } else {
      const gramas = (volumeMl / MEDIDAS_BR.XICARA_ML) * densidade.gramasPorXicara;
      const gramasArredondadas = Math.max(1, Math.round(gramas));
      return {
        quantidade: gramasArredondadas,
        unidade: 'g',
        quantidadeFormatada: `${gramasArredondadas} g`,
        calculadoEmCodigo: true,
        detalheMudanca: {
          original: `${formatarFracaoCulinaria(qtdEscalada)} ${unidade} de ${nome}`,
          adaptado: `${gramasArredondadas} g de ${nome}`,
          motivo: `Conversão por densidade em código (1 xícara = ${densidade.gramasPorXicara}g para ${densidade.nomeCanonica})`,
        },
      };
    }
  }

  // Caso 3: Sem conversão de sistema de medida, mas com possível ajuste de porções
  const calculouEscala = Math.abs(fatorEscala - 1) > 0.001;
  if (
    tipoUnidade === 'xicara' ||
    tipoUnidade === 'colher_sopa' ||
    tipoUnidade === 'colher_cha'
  ) {
    const textoFrac = formatarFracaoCulinaria(qtdEscalada);
    return {
      quantidade: Number(qtdEscalada.toFixed(2)),
      unidade,
      quantidadeFormatada: `${textoFrac} ${unidade}`.trim(),
      calculadoEmCodigo: calculouEscala,
    };
  }

  if (tipoUnidade === 'grama' || tipoUnidade === 'mililitro') {
    const arredondado = Math.round(qtdEscalada);
    return {
      quantidade: arredondado,
      unidade,
      quantidadeFormatada: `${arredondado} ${unidade}`.trim(),
      calculadoEmCodigo: calculouEscala,
    };
  }

  const qtdFormatada = formatarNumeroSimples(qtdEscalada);
  return {
    quantidade: Number(qtdEscalada.toFixed(2)),
    unidade,
    quantidadeFormatada: unidade ? `${qtdFormatada} ${unidade}` : qtdFormatada,
    calculadoEmCodigo: calculouEscala,
  };
}

function formatarNumeroSimples(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.05) {
    return String(Math.round(n));
  }
  return Number(n.toFixed(1)).toString().replace('.', ',');
}
