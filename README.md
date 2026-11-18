# Receita Adaptada 🍲

API e interface web que adapta receitas culinárias à realidade de quem está cozinhando no Brasil — combinando **Inteligência Artificial (Google Gemini API)** para substituições químicas seguras com **cálculo determinístico em TypeScript** para conversão de medidas, ajuste de porções, dimensionamento de forma/assadeira e conversão para Airfryer sem erros matemáticos.

---

## Arquitetura do Projeto

```
Receita Adaptada/
├── prompts/
│   └── adaptador.ts          # System Prompt versionado (v1.2.0), regras químicas, Few-Shot (3 exemplos) e Gemini responseSchema
├── src/
│   ├── schemas.ts            # Schemas Zod de validação rigorosa de entrada e saída
│   ├── conversor.ts          # Tabela de 27 densidades brasileiras + módulo matemático (medidas, formas, forno/Airfryer) em TS
│   ├── adaptadorService.ts   # Orquestrador: chama @google/genai (com retry de validação Zod) + aplica conversor TS
│   └── server.ts             # Servidor Express com rate limiting, rotas da API, 5 receitas de exemplo e arquivos estáticos
├── public/
│   ├── index.html            # Interface web responsiva (comparação lado a lado, checklist, WhatsApp/PDF, chave Gemini, histórico)
│   ├── globals.css           # Identidade visual institucional + folha de impressão (@media print)
│   └── app.js                # Lógica de estado do cliente, checklist interativo, localStorage e exportação
├── tests/
│   └── adaptador.test.ts     # Suíte automatizada com 15 casos de teste (conversões em código, substituições, Airfryer e Zod)
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
   - Consulta a `TABELA_DENSIDADES` brasileira com **27 grupos de ingredientes** (`farinha de trigo = 120 g/xícara`, `açúcar refinado = 180 g/xícara`, `manteiga = 200 g/xícara`, `fubá mimoso = 130 g/xícara`, `leite em pó = 100 g/xícara`, `líquidos = 240 ml/xícara`, etc.);
   - Converte entre `g`/`ml` e medidas caseiras brasileiras (`xícara = 240 ml`, `colher de sopa = 15 ml`, `colher de chá = 5 ml`), formatando frações culinárias naturais (`1 e 2/3 xícaras (chá)`, `1/2 colher (sopa)`);
   - Calcula o **dimensionamento ideal de forma/assadeira** conforme o rendimento final e a **conversão térmica para Airfryer** (`−20 °C` na temperatura e `−22%` no tempo de cozimento).

---

## Funcionalidades de Experiência na Cozinha (UX)

- **Modo Comparação Lado a Lado**: Exibe a receita original colada ao lado da receita recalculada.
- **Modo Mãos na Massa (Checklist Interativo)**: Permite clicar em cada ingrediente separado e em cada etapa concluída durante o preparo.
- **Exportação em 1 Clique**:
  - **Copiar para WhatsApp**: Formata a receita adaptada com negritos e emojis pronta para colar no celular.
  - **Imprimir / Salvar PDF**: Layout limpo (`@media print`) para gerar ficha técnica.
- **Histórico no Navegador (`localStorage`)**: Salva automaticamente as últimas 5 adaptações sem necessidade de banco de dados.
- **Configuração da Chave Gemini na Interface**: Permite colar sua `GEMINI_API_KEY` diretamente no modal **"🔑 Chave Gemini"** no topo da tela (ou usar via arquivo `.env`).

---

## Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar a variável de ambiente (ou configurar pela interface web)
Copie o arquivo `.env.example` para `.env` e insira sua chave da API do Google Gemini:
```bash
cp .env.example .env
```
Edite `.env`:
```env
GEMINI_API_KEY="sua_chave_do_google_ai_studio"
PORT=3000
```

### 3. Executar a suíte de testes (15 casos)
```bash
npm test
```

### 4. Iniciar o servidor e abrir a interface web
```bash
npm run dev
```
Acesse no navegador: **http://localhost:3000**
