import { z } from 'zod';

/**
 * Schema de entrada para o endpoint /api/adaptar
 */
export const AdaptarEntradaSchema = z.object({
  receitaOriginal: z
    .string()
    .trim()
    .min(10, 'A receita original não pode estar vazia. Digite ao menos os ingredientes e o preparo.')
    .max(10000, 'A receita não pode ultrapassar 10.000 caracteres.'),
  converterMedidas: z.enum([
    'nenhuma',
    'para_caseiras', // g/ml -> xícaras, colheres de sopa/chá
    'para_metricas', // xícaras, colheres -> g/ml
  ]).default('nenhuma'),
  substituirIngredientes: z
    .string()
    .trim()
    .max(500, 'A lista de ingredientes para substituir é muito longa.')
    .optional()
    .default(''), // ex: "manteiga, ovo"
  porcoesOriginais: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional(),
  porcoesDesejadas: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional(),
  restricoes: z
    .array(z.enum(['sem_lactose', 'sem_gluten', 'vegano']))
    .default([]),
  adaptarParaAirfryer: z
    .boolean()
    .optional()
    .default(false),
});

export type AdaptarEntrada = z.infer<typeof AdaptarEntradaSchema>;

/**
 * Schema de ingrediente extraído/adaptado (intermediário da IA e final)
 */
export const IngredienteAdaptadoSchema = z.object({
  nome: z.string().min(1, 'Nome do ingrediente obrigatório'),
  quantidade: z.number().nonnegative().nullable(),
  unidade: z.string().default(''),
  quantidadeFormatada: z.string().min(1, 'Quantidade formatada obrigatória'),
  observacao: z.string().default(''),
  foiSubstituido: z.boolean().default(false),
  ingredienteOriginal: z.string().optional(),
});

export type IngredienteAdaptado = z.infer<typeof IngredienteAdaptadoSchema>;

/**
 * Schema da tabela "O que mudou"
 */
export const ItemMudancaSchema = z.object({
  original: z.string().min(1),
  adaptado: z.string().min(1),
  motivo: z.string().min(1),
});

export type ItemMudanca = z.infer<typeof ItemMudancaSchema>;

/**
 * Schema do nível de confiança da adaptação
 */
export const NivelConfiancaSchema = z.object({
  nivel: z.enum(['alta', 'média', 'baixa']),
  justificativa: z.string().min(5),
});

export type NivelConfianca = z.infer<typeof NivelConfiancaSchema>;

/**
 * Schema de recomendação determinística de forma e forno (calculado em código TypeScript)
 */
export const RecomendacaoFormaFornoSchema = z.object({
  formaRecomendada: z.string().min(1),
  ajusteForno: z.string().min(1),
  modoAirfryer: z
    .object({
      ativo: z.boolean(),
      temperaturaOriginalC: z.number().nullable(),
      temperaturaAirfryerC: z.number(),
      tempoOriginalMin: z.number().nullable(),
      tempoAirfryerMin: z.number(),
      resumo: z.string(),
    })
    .optional(),
});

export type RecomendacaoFormaForno = z.infer<typeof RecomendacaoFormaFornoSchema>;

/**
 * Schema que a IA deve retornar antes do pós-processamento matemático
 */
export const RespostaIASchema = z.object({
  tituloReceita: z.string().min(1),
  porcoesOriginaisIdentificadas: z.number().positive(),
  ingredientes: z.array(
    z.object({
      nome: z.string().min(1),
      quantidade: z.number().nonnegative().nullable(),
      unidade: z.string(),
      observacao: z.string(),
      foiSubstituido: z.boolean(),
      ingredienteOriginal: z.string().optional(),
    })
  ).min(1, 'A receita deve conter pelo menos 1 ingrediente.'),
  passoAPasso: z.array(z.string().min(1)).min(1, 'O passo a passo deve ter ao menos 1 etapa.'),
  oQueMudou: z.array(ItemMudancaSchema),
  avisosImpacto: z.array(z.string()),
  confianca: NivelConfiancaSchema,
});

export type RespostaIA = z.infer<typeof RespostaIASchema>;

/**
 * Schema final da resposta da API (validado com Zod antes de devolver ao frontend)
 */
export const RespostaAdaptadaSchema = z.object({
  tituloReceita: z.string().min(1),
  porcoesOriginais: z.number().positive(),
  porcoesFinais: z.number().positive(),
  fatorEscala: z.number().positive(),
  ingredientesAdaptados: z.array(IngredienteAdaptadoSchema).min(1),
  passoAPasso: z.array(z.string().min(1)).min(1),
  oQueMudou: z.array(ItemMudancaSchema),
  avisosImpacto: z.array(z.string()),
  confianca: NivelConfiancaSchema,
  recomendacaoTecnica: RecomendacaoFormaFornoSchema,
  metadadosConversao: z.object({
    conversaoAplicada: z.enum(['nenhuma', 'para_caseiras', 'para_metricas']),
    itensCalculadosEmCodigo: z.number().int().nonnegative(),
    usouFallbackLocal: z.boolean().default(false),
    motorUtilizado: z.enum(['gemini_api', 'regras_local']).default('regras_local'),
  }),
});

export type RespostaAdaptada = z.infer<typeof RespostaAdaptadaSchema>;
