import assert from 'node:assert/strict';
import {
  processarMatematicaIngrediente,
  calcularRecomendacaoFormaEForno,
  TABELA_DENSIDADES,
} from '../src/conversor';
import { AdaptarEntradaSchema, RespostaAdaptadaSchema } from '../src/schemas';
import { adaptarReceita } from '../src/adaptadorService';

interface CasoDeTeste {
  id: number;
  nome: string;
  executar: () => Promise<void>;
}

const casosDeTeste: CasoDeTeste[] = [
  {
    id: 1,
    nome: '200g de farinha de trigo -> xícaras (Cálculo em Código TypeScript: 1 e 2/3 xícara)',
    executar: async () => {
      const res = processarMatematicaIngrediente({
        nome: 'farinha de trigo',
        quantidade: 200,
        unidade: 'g',
        fatorEscala: 1,
        modoConversao: 'para_caseiras',
      });
      assert.equal(res.calculadoEmCodigo, true);
      assert.equal(res.quantidadeFormatada, '1 e 2/3 xícaras (chá)');
    },
  },
  {
    id: 2,
    nome: '180g de açúcar refinado -> xícaras (Cálculo em Código TypeScript: 1 xícara exata)',
    executar: async () => {
      const res = processarMatematicaIngrediente({
        nome: 'açúcar refinado',
        quantidade: 180,
        unidade: 'g',
        fatorEscala: 1,
        modoConversao: 'para_caseiras',
      });
      assert.equal(res.calculadoEmCodigo, true);
      assert.equal(res.quantidadeFormatada, '1 xícara (chá)');
    },
  },
  {
    id: 3,
    nome: 'Medidas brasileiras reversas: 2 xícaras de leite -> 480 ml e 2 colheres (sopa) de manteiga -> 25g',
    executar: async () => {
      const resLeite = processarMatematicaIngrediente({
        nome: 'leite integral',
        quantidade: 2,
        unidade: 'xícaras (chá)',
        fatorEscala: 1,
        modoConversao: 'para_metricas',
      });
      assert.equal(resLeite.quantidade, 480);
      assert.equal(resLeite.unidade, 'ml');

      const resManteiga = processarMatematicaIngrediente({
        nome: 'manteiga',
        quantidade: 2,
        unidade: 'colheres (sopa)',
        fatorEscala: 1,
        modoConversao: 'para_metricas',
      });
      assert.equal(resManteiga.quantidade, 25);
      assert.equal(resManteiga.unidade, 'g');
    },
  },
  {
    id: 4,
    nome: 'Substituição: manteiga -> margarina 1:1 com aviso sobre sabor e redução de sal',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Bolo Amanteigado (8 porções)\n- 240 g de farinha de trigo\n- 100 g de manteiga\n- 180 g de açúcar\n- 2 ovos\nModo de preparo:\n1. Bata a manteiga com açúcar e asse.`,
        converterMedidas: 'nenhuma',
        substituirIngredientes: 'manteiga',
        restricoes: [],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      RespostaAdaptadaSchema.parse(saida);

      const temMargarina = saida.ingredientesAdaptados.some(
        (i) => i.nome.toLowerCase().includes('margarina') && i.quantidade === 100
      );
      assert.equal(temMargarina, true, 'Deve substituir 100g de manteiga por 100g de margarina (1:1)');

      const temAvisoSalOuSabor = saida.avisosImpacto.some(
        (a) => a.toLowerCase().includes('margarina') || a.toLowerCase().includes('sal')
      );
      assert.equal(temAvisoSalOuSabor, true, 'Deve avisar sobre o impacto da margarina no sabor/sal');
    },
  },
  {
    id: 5,
    nome: 'Substituição: 3 ovos -> vegano (3 colheres de sopa de linhaça + 9 de água)',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Bolo de Cenoura (8 porções)\n- 240 g de farinha de trigo\n- 3 ovos\n- 180 ml de óleo\n- 12 g de fermento em pó\nModo de preparo:\n1. Bata tudo e asse a 180C.`,
        converterMedidas: 'nenhuma',
        substituirIngredientes: '',
        restricoes: ['vegano'],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      const ingLinhaca = saida.ingredientesAdaptados.find((i) =>
        i.nome.toLowerCase().includes('linhaça')
      );
      assert.ok(ingLinhaca, 'Deve substituir os 3 ovos por linhaça');
      assert.equal(ingLinhaca.quantidade, 3, 'Para 3 ovos, devem ser 3 colheres de sopa de linhaça');
      assert.ok(
        ingLinhaca.observacao.includes('9') ||
          saida.oQueMudou.some((m) => m.adaptado.includes('9')),
        'Deve indicar 9 colheres de sopa de água (3 para cada ovo)'
      );
    },
  },
  {
    id: 6,
    nome: 'Alerta de Confiança Baixa: substituir ovos em Pão de Ló clássico sem fermento/gordura',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Pão de Ló Clássico (10 porções)\n- 6 ovos\n- 180 g de açúcar\n- 180 g de farinha de trigo\nModo de preparo:\n1. Bata os ovos por 15 min até espumar e incorpore a farinha.`,
        converterMedidas: 'nenhuma',
        substituirIngredientes: 'ovo',
        restricoes: [],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      assert.equal(
        saida.confianca.nivel,
        'baixa',
        'A confiança deve ser BAIXA ao remover ovos de um Pão de Ló clássico'
      );
    },
  },
  {
    id: 7,
    nome: 'Ajuste de porções em código: de 4 para 6 pessoas (fator 1.5x exato)',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Panqueca (4 porções)\n- 200 g de farinha de trigo\n- 240 ml de leite\n- 2 ovos\nModo de preparo:\n1. Misture tudo.`,
        converterMedidas: 'nenhuma',
        porcoesOriginais: 4,
        porcoesDesejadas: 6,
        restricoes: [],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      assert.equal(saida.fatorEscala, 1.5);
      const farinha = saida.ingredientesAdaptados.find((i) => i.nome.includes('farinha'));
      const leite = saida.ingredientesAdaptados.find((i) => i.nome.includes('leite'));
      const ovos = saida.ingredientesAdaptados.find((i) => i.nome.includes('ovo'));

      assert.equal(farinha?.quantidade, 300, '200g * 1.5 = 300g');
      assert.equal(leite?.quantidade, 360, '240ml * 1.5 = 360ml');
      assert.equal(ovos?.quantidade, 3, '2 ovos * 1.5 = 3 ovos');
    },
  },
  {
    id: 8,
    nome: 'Restrição Sem Lactose: substituir leite integral e creme de leite mantendo proporção 1:1',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Estrogonofe Cremoso (4 porções)\n- 240 ml de leite integral\n- 200 g de creme de leite\nModo de preparo:\n1. Cozinhe em fogo baixo.`,
        converterMedidas: 'nenhuma',
        restricoes: ['sem_lactose'],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      assert.equal(saida.ingredientesAdaptados.every((i) => i.foiSubstituido), true);
      assert.ok(saida.oQueMudou.length >= 2);
    },
  },
  {
    id: 9,
    nome: 'Restrição Sem Glúten + Conversão simultânea para medidas caseiras',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Bolo Simples (6 porções)\n- 240 g de farinha de trigo\n- 180 g de açúcar\n- 12 g de fermento em pó\nModo de preparo:\n1. Misture os secos e asse.`,
        converterMedidas: 'para_caseiras',
        restricoes: ['sem_gluten'],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      const mixSemGluten = saida.ingredientesAdaptados.find((i) =>
        i.nome.toLowerCase().includes('sem glúten')
      );
      assert.ok(mixSemGluten, 'Farinha de trigo deve ser substituída por mix sem glúten');
      assert.equal(mixSemGluten.quantidadeFormatada, '2 xícaras (chá)');
    },
  },
  {
    id: 10,
    nome: 'Validação de erro com Zod quando a receita está vazia ou curta demais',
    executar: async () => {
      const resultadoParse = AdaptarEntradaSchema.safeParse({
        receitaOriginal: '   ',
        converterMedidas: 'nenhuma',
      });
      assert.equal(resultadoParse.success, false, 'Receita vazia deve ser rejeitada pelo Zod');
    },
  },
  {
    id: 11,
    nome: 'Novas densidades brasileiras: Fubá mimoso (260g -> 2 xícaras) e Leite em pó (50g -> 1/2 xícara)',
    executar: async () => {
      assert.ok(TABELA_DENSIDADES.length >= 27, 'Tabela deve ter ao menos 27 grupos de ingredientes');
      const fuba = processarMatematicaIngrediente({
        nome: 'fubá mimoso',
        quantidade: 260,
        unidade: 'g',
        fatorEscala: 1,
        modoConversao: 'para_caseiras',
      });
      assert.equal(fuba.quantidadeFormatada, '2 xícaras (chá)');

      const leiteEmPo = processarMatematicaIngrediente({
        nome: 'leite em pó',
        quantidade: 50,
        unidade: 'g',
        fatorEscala: 1,
        modoConversao: 'para_caseiras',
      });
      assert.equal(leiteEmPo.quantidadeFormatada, '1/2 xícara (chá)');
    },
  },
  {
    id: 12,
    nome: 'Conversão térmica para Airfryer em código: 180°C por 40 min -> 160°C por 31 min',
    executar: async () => {
      const rec = calcularRecomendacaoFormaEForno({
        textoOriginal: 'Asse em forno preaquecido a 180°C por 40 minutos.',
        porcoesFinais: 8,
        fatorEscala: 1,
        adaptarParaAirfryer: true,
      });
      assert.ok(rec.modoAirfryer?.ativo);
      assert.equal(rec.modoAirfryer?.temperaturaAirfryerC, 160);
      assert.equal(rec.modoAirfryer?.tempoAirfryerMin, 31);
    },
  },
  {
    id: 13,
    nome: 'Dimensionamento automático de forma em código ao dobrar porções (8 -> 16 porções)',
    executar: async () => {
      const rec8 = calcularRecomendacaoFormaEForno({
        textoOriginal: 'Asse a 180°C por 35 minutos.',
        porcoesFinais: 8,
        fatorEscala: 1,
        adaptarParaAirfryer: false,
      });
      const rec16 = calcularRecomendacaoFormaEForno({
        textoOriginal: 'Asse a 180°C por 35 minutos.',
        porcoesFinais: 16,
        fatorEscala: 2,
        adaptarParaAirfryer: false,
      });
      assert.notEqual(rec8.formaRecomendada, rec16.formaRecomendada);
      assert.ok(rec16.formaRecomendada.includes('25×35 cm'));
    },
  },
  {
    id: 14,
    nome: 'Adaptação combinada completa: Fração mista (1 e 1/2 xícara) + Sem Glúten + Vegano + Airfryer + Métricas',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Cookies Caseiros (6 porções)\n- 1 e 1/2 xícara (chá) de farinha de trigo\n- 1/2 xícara (chá) de manteiga\n- 1 ovo\nModo de preparo:\n1. Asse a 180°C por 15 minutos.`,
        converterMedidas: 'para_metricas',
        restricoes: ['sem_gluten', 'vegano'],
        adaptarParaAirfryer: true,
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      const mixFarinha = saida.ingredientesAdaptados.find((i) =>
        i.nome.toLowerCase().includes('sem glúten')
      );
      // 1.5 xícara de farinha * 120g = 180g
      assert.equal(mixFarinha?.quantidade, 180);
      assert.equal(mixFarinha?.unidade, 'g');
      assert.equal(saida.recomendacaoTecnica.modoAirfryer?.temperaturaAirfryerC, 160);
      assert.equal(saida.confianca.nivel, 'média');
    },
  },
  {
    id: 15,
    nome: 'Substituição de fermento em pó ("não tenho: fermento") por bicarbonato de sódio + ácido',
    executar: async () => {
      const entrada = AdaptarEntradaSchema.parse({
        receitaOriginal: `Bolo Rápido (6 porções)\n- 240 g de farinha de trigo\n- 1 colher (sopa) de fermento em pó\nModo de preparo:\n1. Misture e asse.`,
        converterMedidas: 'nenhuma',
        substituirIngredientes: 'fermento',
        restricoes: [],
      });

      const saida = await adaptarReceita(entrada, { permitirFallbackSemChave: true });
      const temBicarbonato = saida.ingredientesAdaptados.some((i) =>
        i.nome.toLowerCase().includes('bicarbonato')
      );
      assert.equal(temBicarbonato, true, 'Deve substituir fermento por bicarbonato + ácido');
    },
  },
];

async function rodarSuiteDeTestes() {
  console.log('================================================================');
  console.log('🧪 EXECUTANDO SUÍTE DE TESTES - RECEITA ADAPTADA (15 CASOS)');
  console.log('================================================================\n');

  let passaram = 0;
  let falharam = 0;

  for (const caso of casosDeTeste) {
    try {
      await caso.executar();
      console.log(`✅ [PASSOU] Caso #${caso.id}: ${caso.nome}`);
      passaram++;
    } catch (err: any) {
      console.error(`❌ [FALHOU] Caso #${caso.id}: ${caso.nome}`);
      console.error(`   Motivo: ${err?.message || err}`);
      falharam++;
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Resumo Final: ${passaram}/${casosDeTeste.length} testes passaram.`);
  console.log('----------------------------------------------------------------');

  if (falharam > 0) {
    process.exit(1);
  }
}

rodarSuiteDeTestes();
