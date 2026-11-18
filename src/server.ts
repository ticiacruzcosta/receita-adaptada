import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import { AdaptarEntradaSchema } from './schemas';
import { adaptarReceita } from './adaptadorService';
import { TABELA_DENSIDADES, MEDIDAS_BR } from './conversor';
import { VERSAO_PROMPT_ADAPTADOR } from '../prompts/adaptador';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Servir arquivos estáticos da interface web (HTML/Tailwind/JS)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

/**
 * Receitas de exemplo prontas para teste imediato na interface
 */
export const RECEITAS_EXEMPLO = {
  bolo_cenoura: {
    id: 'bolo_cenoura',
    nome: 'Bolo de Cenoura Clássico com Cobertura',
    porcoesOriginais: 8,
    porcoesDesejadas: 12,
    converterMedidas: 'para_caseiras',
    substituirIngredientes: 'manteiga, leite',
    restricoes: ['sem_lactose'],
    receitaOriginal: `Bolo de Cenoura Clássico (Rende 8 porções)

Ingredientes:
- 260 g de cenoura picada
- 3 ovos
- 180 ml de óleo de milho
- 270 g de açúcar refinado
- 240 g de farinha de trigo
- 12 g de fermento em pó
- 50 g de manteiga com sal (para a calda)
- 45 g de chocolate em pó (para a calda)
- 120 ml de leite integral (para a calda)

Modo de preparo:
1. No liquidificador, bata a cenoura picada, os ovos e o óleo até obter um creme bem liso.
2. Em uma tigela, misture o açúcar e a farinha de trigo peneirada.
3. Junte o creme do liquidificador aos secos e misture com um fouet.
4. Adicione o fermento em pó delicadamente e despeje em forma untada.
5. Asse em forno preaquecido a 180°C por 40 minutos.
6. Para a calda, leve ao fogo a manteiga, o chocolate em pó e o leite até engrossar levemente e cubra o bolo.`,
  },
  panqueca_tradicional: {
    id: 'panqueca_tradicional',
    nome: 'Panqueca Caseira (Teste Vegano + Métrico)',
    porcoesOriginais: 4,
    porcoesDesejadas: 6,
    converterMedidas: 'para_metricas',
    substituirIngredientes: 'ovo, manteiga',
    restricoes: ['vegano'],
    receitaOriginal: `Panqueca Caseira Tradicional (Rende 4 porções)

Ingredientes:
- 1 xícara (chá) de farinha de trigo
- 1 xícara (chá) de leite integral
- 2 ovos
- 2 colheres (sopa) de manteiga derretida
- 1 colher (chá) de fermento em pó

Modo de preparo:
1. Bata todos os ingredientes no liquidificador por 1 minuto até ficar homogêneo.
2. Aqueça uma frigideira antiaderente em fogo médio e espalhe uma concha da massa.
3. Doure dos dois lados e recheie a gosto.`,
  },
  pao_de_lo: {
    id: 'pao_de_lo',
    nome: 'Pão de Ló Clássico (Teste de Alerta de Confiança Baixa)',
    porcoesOriginais: 10,
    porcoesDesejadas: 10,
    converterMedidas: 'para_caseiras',
    substituirIngredientes: 'ovo',
    restricoes: [],
    receitaOriginal: `Pão de Ló Clássico de Confeitaria (Rende 10 porções)

Ingredientes:
- 6 ovos
- 180 g de açúcar refinado
- 180 g de farinha de trigo

Modo de preparo:
1. Na batedeira em velocidade alta, bata os 6 ovos com o açúcar por 15 minutos até triplicar de volume e formar uma espuma firme.
2. Desligue a batedeira e incorpore a farinha de trigo peneirada aos poucos, com movimentos de baixo para cima usando fouet para não perder a aeração (não vai fermento nem gordura).
3. Asse a 180°C por 30 minutos.`,
  },
};

/**
 * GET /api/status - Diagnóstico da API, versão do prompt e tabela de densidades
 */
app.get('/api/status', (_req: Request, res: Response) => {
  const temChaveGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    status: 'online',
    projeto: 'Receita Adaptada',
    versaoPrompt: VERSAO_PROMPT_ADAPTADOR,
    geminiConfigurado: temChaveGemini,
    medidasBrasileirasPadrao: MEDIDAS_BR,
    totalIngredientesTabelaDensidade: TABELA_DENSIDADES.length,
  });
});

/**
 * GET /api/exemplos - Retorna receitas de exemplo (incluindo Bolo de Cenoura)
 */
app.get('/api/exemplos', (_req: Request, res: Response) => {
  res.json({
    exemplos: Object.values(RECEITAS_EXEMPLO),
  });
});

/**
 * GET /api/densidades - Retorna a tabela de densidades usada pelo conversor em código
 */
app.get('/api/densidades', (_req: Request, res: Response) => {
  res.json({
    medidasBase: MEDIDAS_BR,
    densidades: TABELA_DENSIDADES,
  });
});

/**
 * POST /api/adaptar - Endpoint principal com validação Zod na entrada e na saída
 */
app.post('/api/adaptar', async (req: Request, res: Response) => {
  try {
    // 1. Valida a entrada com Zod
    const entradaValidada = AdaptarEntradaSchema.parse(req.body);

    // 2. Executa a adaptação (usa Gemini se GEMINI_API_KEY estiver presente; se o usuário permitir fallback de demonstração ou se for ambiente sem chave com flag, informa claramente)
    const permitirFallback =
      process.env.ALLOW_LOCAL_FALLBACK !== 'false' && !process.env.GEMINI_API_KEY?.trim();

    const resultado = await adaptarReceita(entradaValidada, {
      permitirFallbackSemChave: permitirFallback,
    });

    res.json({
      sucesso: true,
      dados: resultado,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      const mensagens = err.issues.map((issue) => issue.message).join(' ');
      res.status(400).json({
        sucesso: false,
        erro: 'Dados de entrada inválidos.',
        detalhes: mensagens,
        problemas: err.issues,
      });
      return;
    }

    console.error('[Erro em /api/adaptar]:', err);
    res.status(500).json({
      sucesso: false,
      erro: err?.message || 'Ocorreu um erro ao processar e adaptar a receita.',
    });
  }
});

// Fallback para SPA
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================================`);
    console.log(`🍲 Receita Adaptada rodando em: http://localhost:${PORT}`);
    console.log(`📌 Prompt Version: v${VERSAO_PROMPT_ADAPTADOR}`);
    console.log(
      `🔑 GEMINI_API_KEY: ${
        process.env.GEMINI_API_KEY ? 'Configurada (Modo Gemini IA Ativo)' : 'Ausente (Modo Demonstração/Regras Ativo)'
      }`
    );
    console.log(`=========================================================`);
  });
}

export default app;
