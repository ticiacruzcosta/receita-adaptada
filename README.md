# Receita Adaptada 🍲

API e interface web que adapta receitas culinárias à realidade de quem está cozinhando no Brasil — combinando **Inteligência Artificial (Google Gemini API)** para substituições químicas seguras com **cálculo determinístico em TypeScript** para conversão de medidas e ajuste de porções sem erros matemáticos.

---

## Arquitetura do Projeto

```
Receita Adaptada/
├── prompts/
│   └── adaptador.ts          # System Prompt versionado (v1.2.0), regras químicas, Few-Shot (3 exemplos) e Gemini responseSchema
├── src/
│   ├── schemas.ts            # Schemas Zod de validação rigorosa de entrada e saída
│   ├── conversor.ts          # Tabela de densidades brasileiras e módulo matemático de conversão em código TS
│   ├── adaptadorService.ts   # Orquestrador: chama @google/genai (com retry de validação Zod) + aplica conversor TS
│   └── server.ts             # Servidor Express com rotas da API e arquivos estáticos
├── public/
│   ├── index.html            # Interface web responsiva (modo comparação lado a lado, receita de exemplo, tabela de mudanças)
│   ├── globals.css           # Identidade visual institucional (cartões, botões pílula, banner degradê, tabelas)
│   └── app.js                # Lógica de estado do cliente, atalhos e renderização estruturada
├── tests/
│   └── adaptador.test.ts     # Suíte automatizada com 10 casos de teste (conversões em código, substituições e Zod)
├── .env.example              # Exemplo de configuração de variáveis de ambiente
├── package.json
└── tsconfig.json
```

### Divisão de Responsabilidades: IA vs. Código TypeScript

Um dos problemas mais comuns ao usar LLMs em receitas é a imprecisão aritmética ao converter gramas para xícaras ou escalar frações. Para resolver isso:

1. **O que a IA (`@google/genai` + `prompts/adaptador.ts`) faz:**
   - Interpreta o texto livre da receita original;
   - Identifica cada ingrediente, sua quantidade numérica original e sua unidade;
   - Aplica substituições químicas solicitadas pelo usuário (campo *"não tenho"* e restrições *sem lactose*, *sem glúten* e *vegano*);
   - Reescreve o passo a passo, gera avisos francos de impacto sensorial/estrutural e classifica o nível de confiança (`alta`, `média` ou `baixa`).

2. **O que o Código TypeScript (`src/conversor.ts`) faz:**
   - Calcula o **fator de escala exato** das porções (`porcoesDesejadas / porcoesOriginais`);
   - Consulta a `TABELA_DENSIDADES` brasileira (ex.: `1 xícara de farinha de trigo = 120 g`, `1 xícara de açúcar refinado = 180 g`, `1 xícara de manteiga = 200 g`, `1 xícara de líquidos = 240 ml`);
   - Converte entre `g`/`ml` e medidas caseiras brasileiras (`xícara = 240 ml`, `colher de sopa = 15 ml`, `colher de chá = 5 ml`), formatando frações culinárias naturais (`1 e 2/3 xícaras (chá)`, `1/2 colher (sopa)`).

---

## Decisões de Engenharia de Prompt (`prompts/adaptador.ts`)

1. **System Prompt Separado e Versionado (`VERSAO_PROMPT_ADAPTADOR = '1.2.0'`)**:
   - Facilita auditoria, evolução das regras gastronômicas e testes de regressão sem misturar instruções de prompt com código de roteamento HTTP.
2. **Proibição de Alucinação e Preservação de Proporção Química**:
   - A IA é instruída a nunca inventar ingredientes extras não solicitados e a manter o equilíbrio entre estrutura (farinha/proteínas), hidratação (líquidos), lipídios (manteiga/óleo) e agentes de crescimento (fermento/bicarbonato).
3. **Honestidade Técnica (Nível de Confiança Baixo quando necessário)**:
   - Em receitas cuja estrutura depende 100% da espuma mecânica dos ovos (como **Pão de Ló clássico sem fermento/gordura**, suflê ou suspiro), o prompt proíbe a IA de prometer resultados milagrosos: ela emite alerta crítico e define `confianca.nivel = "baixa"`.
4. **Exemplos Few-Shot Inclusos no Prompt**:
   - 3 exemplos completos de entrada e saída JSON guiam o modelo:
     1. Substituição 1:1 de *manteiga por margarina* com aviso de sal e sabor;
     2. Adaptação *vegana* trocando ovos por gel de linhaça (`1 colher de sopa de linhaça + 3 de água` por ovo);
     3. Caso crítico de *Pão de Ló sem ovos* resultando em confiança `baixa`.
5. **Structured Output (`responseSchema`) + Validação Dupla com Zod + Auto-Retry**:
   - A chamada ao Gemini usa `responseMimeType: "application/json"` e `responseSchema`.
   - O retorno passa por `RespostaIASchema.safeParse()`. Caso ocorra qualquer divergência de schema ou sintaxe, o serviço realiza **1 nova tentativa automática** injetando o erro exato do Zod no prompt para autocorreção.

---

## Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar a variável de ambiente
Copie o arquivo `.env.example` para `.env` e insira sua chave da API do Google Gemini:
```bash
cp .env.example .env
```
Edite `.env`:
```env
GEMINI_API_KEY="sua_chave_do_google_ai_studio"
PORT=3000
```
*(Observação: Caso você rode o projeto localmente sem `GEMINI_API_KEY` definida para avaliação rápida, o servidor ativa automaticamente o motor heurístico de demonstração aliado ao conversor determinístico em TypeScript).*

### 3. Executar a suíte de testes (~10 casos)
```bash
npm test
```

### 4. Iniciar o servidor e abrir a interface web
```bash
npm run dev
```
Acesse no navegador: **http://localhost:3000**
