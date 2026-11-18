/**
 * Script da Interface Web - Receita Adaptada
 */

document.addEventListener('DOMContentLoaded', () => {
  const CHAVE_STORAGE_HISTORICO = 'receita_adaptada_historico_v1';
  const CHAVE_STORAGE_API_KEY = 'receita_adaptada_gemini_key';

  const campoReceitaOriginal = document.getElementById('campoReceitaOriginal');
  const contadorCaracteres = document.getElementById('contadorCaracteres');
  const selectConversao = document.getElementById('selectConversao');
  const inputSubstituir = document.getElementById('inputSubstituir');
  const inputPorcoesOriginais = document.getElementById('inputPorcoesOriginais');
  const inputPorcoesDesejadas = document.getElementById('inputPorcoesDesejadas');
  const checkAirfryer = document.getElementById('checkAirfryer');
  const formAdaptar = document.getElementById('formAdaptar');
  const btnSubmeter = document.getElementById('btnSubmeter');
  const textoBotaoSubmeter = document.getElementById('textoBotaoSubmeter');

  const btnExemploCenoura = document.getElementById('btnExemploCenoura');
  const selectMaisExemplos = document.getElementById('selectMaisExemplos');
  const btnLimpar = document.getElementById('btnLimpar');

  const alertaErro = document.getElementById('alertaErro');
  const mensagemErro = document.getElementById('mensagemErro');
  const btnFecharErro = document.getElementById('btnFecharErro');

  const secaoResultado = document.getElementById('secaoResultado');
  const statusBadge = document.getElementById('statusBadge');
  const versaoPromptPill = document.getElementById('versaoPromptPill');

  // Histórico localStorage
  const secaoHistorico = document.getElementById('secaoHistorico');
  const listaHistoricoPills = document.getElementById('listaHistoricoPills');
  const btnLimparHistorico = document.getElementById('btnLimparHistorico');

  // Exportação (WhatsApp e PDF)
  const btnCopiarWhatsApp = document.getElementById('btnCopiarWhatsApp');
  const btnImprimirPDF = document.getElementById('btnImprimirPDF');

  // Modal Densidades
  const modalDensidades = document.getElementById('modalDensidades');
  const btnAbrirDensidades = document.getElementById('btnAbrirDensidades');
  const btnFecharDensidades = document.getElementById('btnFecharDensidades');
  const tabelaDensidadesBody = document.getElementById('tabelaDensidadesBody');

  // Modal Chave Gemini
  const modalConfigApi = document.getElementById('modalConfigApi');
  const btnAbrirConfigApi = document.getElementById('btnAbrirConfigApi');
  const btnFecharConfigApi = document.getElementById('btnFecharConfigApi');
  const inputGeminiKeyModal = document.getElementById('inputGeminiKeyModal');
  const btnSalvarKeyModal = document.getElementById('btnSalvarKeyModal');
  const btnRemoverKeyModal = document.getElementById('btnRemoverKeyModal');

  let cacheExemplos = {};
  let ultimoResultado = null;

  function obterApiKeySalva() {
    return (localStorage.getItem(CHAVE_STORAGE_API_KEY) || '').trim();
  }

  function atualizarContador() {
    const len = campoReceitaOriginal.value.trim().length;
    contadorCaracteres.textContent = `${len} caracteres`;
  }

  campoReceitaOriginal.addEventListener('input', atualizarContador);

  function mostrarErro(msg) {
    mensagemErro.textContent = msg;
    alertaErro.classList.remove('hidden');
    alertaErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function ocultarErro() {
    alertaErro.classList.add('hidden');
  }

  btnFecharErro.addEventListener('click', ocultarErro);

  async function atualizarBadgeStatus() {
    try {
      const headers = {};
      const keyLocal = obterApiKeySalva();
      if (keyLocal) {
        headers['x-gemini-api-key'] = keyLocal;
      }
      const resStatus = await fetch('/api/status', { headers });
      if (resStatus.ok) {
        const status = await resStatus.json();
        versaoPromptPill.textContent = `Prompt v${status.versaoPrompt}`;
        if (status.geminiConfigurado) {
          statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Gemini API Conectada</span>`;
        } else {
          statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#F39200]"></span><span>Modo Local + Conversor TS</span>`;
        }
      }
    } catch (e) {
      console.error('Erro ao checar status:', e);
    }
  }

  async function inicializar() {
    await atualizarBadgeStatus();
    renderizarHistorico();

    try {
      const [resExemplos, resDensidades] = await Promise.all([
        fetch('/api/exemplos'),
        fetch('/api/densidades'),
      ]);

      if (resExemplos.ok) {
        const dadosExemplos = await resExemplos.json();
        for (const ex of dadosExemplos.exemplos) {
          cacheExemplos[ex.id] = ex;
        }
      }

      if (resDensidades.ok) {
        const dadosDens = await resDensidades.json();
        tabelaDensidadesBody.innerHTML = dadosDens.densidades
          .map((d) => {
            const colherSopaG = (d.gramasPorXicara / 16).toFixed(1).replace('.', ',');
            return `
              <tr class="hover:bg-slate-50">
                <td class="py-2.5 px-4 font-semibold text-[#1A2332]">${d.nomeCanonica}</td>
                <td class="py-2.5 px-4">${d.ehLiquido ? '240 ml' : d.gramasPorXicara + ' g'}</td>
                <td class="py-2.5 px-4">${d.ehLiquido ? '15 ml' : '~' + colherSopaG + ' g'}</td>
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    d.ehLiquido ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-[#B45309]'
                  }">
                    ${d.ehLiquido ? 'Líquido' : 'Seco/Sólido'}
                  </span>
                </td>
              </tr>
            `;
          })
          .join('');
      }
    } catch (e) {
      console.error('Erro ao inicializar:', e);
    }
  }

  function preencherExemplo(idExemplo) {
    ocultarErro();
    const ex = cacheExemplos[idExemplo];
    if (!ex) return;

    campoReceitaOriginal.value = ex.receitaOriginal;
    selectConversao.value = ex.converterMedidas || 'para_caseiras';
    inputSubstituir.value = ex.substituirIngredientes || '';
    inputPorcoesOriginais.value = ex.porcoesOriginais || '';
    inputPorcoesDesejadas.value = ex.porcoesDesejadas || '';
    checkAirfryer.checked = Boolean(ex.adaptarParaAirfryer);

    const checkboxes = document.querySelectorAll('input[name="restricoes"]');
    checkboxes.forEach((cb) => {
      cb.checked = Array.isArray(ex.restricoes) && ex.restricoes.includes(cb.value);
    });

    atualizarContador();
  }

  btnExemploCenoura.addEventListener('click', () => {
    selectMaisExemplos.value = 'bolo_cenoura';
    preencherExemplo('bolo_cenoura');
  });

  selectMaisExemplos.addEventListener('change', (e) => {
    if (e.target.value) {
      preencherExemplo(e.target.value);
    }
  });

  btnLimpar.addEventListener('click', () => {
    campoReceitaOriginal.value = '';
    inputSubstituir.value = '';
    inputPorcoesOriginais.value = '';
    inputPorcoesDesejadas.value = '';
    checkAirfryer.checked = false;
    selectMaisExemplos.value = '';
    document.querySelectorAll('input[name="restricoes"]').forEach((cb) => (cb.checked = false));
    secaoResultado.classList.add('hidden');
    ocultarErro();
    atualizarContador();
  });

  // Botões de atalho "+ manteiga", "+ ovo", etc.
  document.querySelectorAll('.atalho-ing').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ing = btn.getAttribute('data-add-ing');
      const atual = inputSubstituir.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!atual.includes(ing)) {
        atual.push(ing);
        inputSubstituir.value = atual.join(', ');
      }
    });
  });

  // Modal de densidades
  btnAbrirDensidades.addEventListener('click', () => {
    modalDensidades.classList.remove('hidden');
    modalDensidades.classList.add('flex');
  });

  btnFecharDensidades.addEventListener('click', () => {
    modalDensidades.classList.add('hidden');
    modalDensidades.classList.remove('flex');
  });

  modalDensidades.addEventListener('click', (e) => {
    if (e.target === modalDensidades) {
      modalDensidades.classList.add('hidden');
      modalDensidades.classList.remove('flex');
    }
  });

  // Modal Configurar Chave Gemini
  btnAbrirConfigApi.addEventListener('click', () => {
    inputGeminiKeyModal.value = obterApiKeySalva();
    modalConfigApi.classList.remove('hidden');
    modalConfigApi.classList.add('flex');
  });

  btnFecharConfigApi.addEventListener('click', () => {
    modalConfigApi.classList.add('hidden');
    modalConfigApi.classList.remove('flex');
  });

  btnSalvarKeyModal.addEventListener('click', async () => {
    const val = inputGeminiKeyModal.value.trim();
    if (val) {
      localStorage.setItem(CHAVE_STORAGE_API_KEY, val);
    } else {
      localStorage.removeItem(CHAVE_STORAGE_API_KEY);
    }
    modalConfigApi.classList.add('hidden');
    modalConfigApi.classList.remove('flex');
    await atualizarBadgeStatus();
  });

  btnRemoverKeyModal.addEventListener('click', async () => {
    localStorage.removeItem(CHAVE_STORAGE_API_KEY);
    inputGeminiKeyModal.value = '';
    modalConfigApi.classList.add('hidden');
    modalConfigApi.classList.remove('flex');
    await atualizarBadgeStatus();
  });

  // Histórico de Adaptações no localStorage
  function salvarNoHistorico(receitaOriginalTexto, dados) {
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE_STORAGE_HISTORICO) || '[]');
      const novoItem = {
        id: Date.now(),
        titulo: dados.tituloReceita,
        porcoesFinais: dados.porcoesFinais,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        receitaOriginalTexto,
        dados,
      };
      const filtrada = [novoItem, ...lista.filter((x) => x.titulo !== dados.tituloReceita)].slice(0, 5);
      localStorage.setItem(CHAVE_STORAGE_HISTORICO, JSON.stringify(filtrada));
      renderizarHistorico();
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }
  }

  function renderizarHistorico() {
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE_STORAGE_HISTORICO) || '[]');
      if (!Array.isArray(lista) || lista.length === 0) {
        secaoHistorico.classList.add('hidden');
        return;
      }
      secaoHistorico.classList.remove('hidden');
      listaHistoricoPills.innerHTML = lista
        .map(
          (item, idx) => `
          <button type="button" data-hist-idx="${idx}" class="btn-hist-item text-xs px-3 py-1.5 rounded-full bg-[#F1F3F6] hover:bg-orange-100 text-[#1A2332] font-medium transition flex items-center gap-1.5">
            <span>🕒 ${item.titulo}</span>
            <span class="text-[10px] text-slate-500">(${item.porcoesFinais} porções • ${item.horario})</span>
          </button>
        `
        )
        .join('');

      document.querySelectorAll('.btn-hist-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-hist-idx'));
          const item = lista[idx];
          if (item) {
            campoReceitaOriginal.value = item.receitaOriginalTexto;
            atualizarContador();
            renderizarResultado(item.receitaOriginalTexto, item.dados);
          }
        });
      });
    } catch (e) {
      secaoHistorico.classList.add('hidden');
    }
  }

  btnLimparHistorico.addEventListener('click', () => {
    localStorage.removeItem(CHAVE_STORAGE_HISTORICO);
    renderizarHistorico();
  });

  // Exportação para WhatsApp e Impressão PDF
  btnCopiarWhatsApp.addEventListener('click', async () => {
    if (!ultimoResultado) return;
    const d = ultimoResultado;
    const linhasIng = d.ingredientesAdaptados
      .map((i) => `• *${i.quantidadeFormatada}* de ${i.nome}${i.observacao ? ` _(${i.observacao})_` : ''}`)
      .join('\n');
    const linhasPassos = d.passoAPasso.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
    const linhasAvisos = d.avisosImpacto.map((a) => `⚠️ ${a}`).join('\n');

    const textoWhats = `🍲 *${d.tituloReceita}* (Receita Adaptada)
👥 *Rendimento:* ${d.porcoesFinais} porções (${d.fatorEscala}x)
🥧 *Forma sugerida:* ${d.recomendacaoTecnica.formaRecomendada}
🌡️ *Forno:* ${d.recomendacaoTecnica.ajusteForno}

📋 *INGREDIENTES ADAPTADOS:*
${linhasIng}

👩‍🍳 *PASSO A PASSO:*
${linhasPassos}

💡 *AVISOS CULINÁRIOS:*
${linhasAvisos}
`;

    try {
      await navigator.clipboard.writeText(textoWhats);
      const originalText = btnCopiarWhatsApp.textContent;
      btnCopiarWhatsApp.textContent = '✅ Copiado para WhatsApp!';
      setTimeout(() => {
        btnCopiarWhatsApp.textContent = originalText;
      }, 2500);
    } catch (e) {
      mostrarErro('Não foi possível copiar automaticamente para a área de transferência.');
    }
  });

  btnImprimirPDF.addEventListener('click', () => {
    window.print();
  });

  // Submissão do formulário
  formAdaptar.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarErro();

    const receitaOriginal = campoReceitaOriginal.value.trim();
    if (!receitaOriginal || receitaOriginal.length < 10) {
      mostrarErro('Por favor, cole uma receita válida (mínimo de 10 caracteres) ou clique em "Usar receita de exemplo".');
      return;
    }

    const restricoesSelecionadas = Array.from(
      document.querySelectorAll('input[name="restricoes"]:checked')
    ).map((cb) => cb.value);

    const payload = {
      receitaOriginal,
      converterMedidas: selectConversao.value,
      substituirIngredientes: inputSubstituir.value.trim(),
      restricoes: restricoesSelecionadas,
      adaptarParaAirfryer: checkAirfryer.checked,
    };

    if (inputPorcoesOriginais.value) {
      payload.porcoesOriginais = Number(inputPorcoesOriginais.value);
    }
    if (inputPorcoesDesejadas.value) {
      payload.porcoesDesejadas = Number(inputPorcoesDesejadas.value);
    }

    btnSubmeter.disabled = true;
    textoBotaoSubmeter.textContent = 'Processando Química Culinária e Conversões...';

    try {
      const headers = { 'Content-Type': 'application/json' };
      const keyLocal = obterApiKeySalva();
      if (keyLocal) {
        headers['x-gemini-api-key'] = keyLocal;
      }

      const resposta = await fetch('/api/adaptar', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await resposta.json();
      if (!resposta.ok || !json.sucesso) {
        throw new Error(json.detalhes || json.erro || 'Falha ao adaptar a receita.');
      }

      salvarNoHistorico(receitaOriginal, json.dados);
      renderizarResultado(receitaOriginal, json.dados);
    } catch (err) {
      mostrarErro(err.message || 'Erro de comunicação com o servidor.');
    } finally {
      btnSubmeter.disabled = false;
      textoBotaoSubmeter.textContent = 'Adaptar Receita Agora';
    }
  });

  function atualizarContadorChecklist() {
    const total = document.querySelectorAll('.check-ingrediente').length;
    const marcados = document.querySelectorAll('.check-ingrediente:checked').length;
    const spanProg = document.getElementById('progressoIngredientes');
    if (spanProg) {
      spanProg.textContent = `${marcados}/${total} separados`;
    }
  }

  function renderizarResultado(receitaOriginalTexto, dados) {
    ultimoResultado = dados;

    document.getElementById('tituloReceitaAdaptada').textContent = dados.tituloReceita;
    document.getElementById('badgeRendimento').textContent = `Rendimento: ${dados.porcoesOriginais} ➔ ${dados.porcoesFinais} porções (${dados.fatorEscala}x)`;
    document.getElementById('badgeCalculoCodigo').textContent = `${dados.metadadosConversao.itensCalculadosEmCodigo} ingredientes calculados em código TS`;

    const badgeMotorIA = document.getElementById('badgeMotorIA');
    if (dados.metadadosConversao.motorUtilizado === 'gemini_api') {
      badgeMotorIA.textContent = '✨ Motor: Gemini Structured Output';
      badgeMotorIA.className = 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold';
    } else {
      badgeMotorIA.textContent = '⚙️ Motor: Regras Químicas + Conversor TS';
      badgeMotorIA.className = 'px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold';
    }

    // Recomendação Técnica de Forma e Forno/Airfryer
    if (dados.recomendacaoTecnica) {
      document.getElementById('textoFormaRecomendada').textContent =
        dados.recomendacaoTecnica.formaRecomendada;
      document.getElementById('textoAjusteForno').textContent =
        dados.recomendacaoTecnica.ajusteForno;
    }

    // Nível de confiança (alta / média / baixa)
    const cardConfianca = document.getElementById('cardConfianca');
    const pontoConfianca = document.getElementById('pontoConfianca');
    const nivelConfiancaTexto = document.getElementById('nivelConfiancaTexto');
    const justificativaConfiancaTexto = document.getElementById('justificativaConfiancaTexto');

    const nivel = dados.confianca.nivel;
    nivelConfiancaTexto.textContent = nivel;
    justificativaConfiancaTexto.textContent = dados.confianca.justificativa;

    cardConfianca.className = 'p-4 rounded-2xl border flex items-start gap-3 max-w-md ';
    pontoConfianca.className = 'w-3 h-3 rounded-full mt-1.5 shrink-0 ';
    nivelConfiancaTexto.className = 'text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ';

    if (nivel === 'alta') {
      cardConfianca.classList.add('bg-emerald-50/80', 'border-emerald-200', 'text-emerald-950');
      pontoConfianca.classList.add('bg-emerald-500');
      nivelConfiancaTexto.classList.add('bg-emerald-200', 'text-emerald-900');
    } else if (nivel === 'média') {
      cardConfianca.classList.add('bg-amber-50/90', 'border-amber-200', 'text-amber-950');
      pontoConfianca.classList.add('bg-[#F39200]');
      nivelConfiancaTexto.classList.add('bg-amber-200', 'text-amber-900');
    } else {
      cardConfianca.classList.add('bg-red-50/90', 'border-red-300', 'text-red-950');
      pontoConfianca.classList.add('bg-red-600');
      nivelConfiancaTexto.classList.add('bg-red-200', 'text-red-900');
    }

    // Modo Comparação Lado a Lado
    document.getElementById('porcoesOriginaisTag').textContent = `${dados.porcoesOriginais} porções`;
    document.getElementById('porcoesAdaptadasTag').textContent = `${dados.porcoesFinais} porções`;
    document.getElementById('comparacaoTextoOriginal').textContent = receitaOriginalTexto;

    // Lista de Ingredientes Adaptada com Checklist Interativo
    const listaIng = document.getElementById('listaIngredientesAdaptados');
    listaIng.innerHTML = dados.ingredientesAdaptados
      .map((ing, idx) => {
        const badgeSub = ing.foiSubstituido
          ? `<span class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#C2410C]">
               <span class="w-1.5 h-1.5 rounded-full bg-[#F39200]"></span>Substituído
             </span>`
          : '';
        const obs = ing.observacao
          ? `<span class="block text-xs text-slate-500 mt-0.5 italic">Obs: ${ing.observacao}</span>`
          : '';
        return `
          <li class="p-2.5 rounded-xl transition cursor-pointer ${
            ing.foiSubstituido ? 'bg-orange-50/70 border border-orange-200/70' : 'bg-[#F4F6F9]'
          }">
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" data-ing-idx="${idx}" class="check-ingrediente accent-[#C2410C] w-4 h-4 mt-1 shrink-0" />
              <div class="texto-check-alvo flex-1">
                <div>
                  <strong class="text-[#1A2332] font-bold">${ing.quantidadeFormatada}</strong>
                  <span class="text-slate-800"> de ${ing.nome}</span>
                  ${badgeSub}
                </div>
                ${obs}
              </div>
            </label>
          </li>
        `;
      })
      .join('');

    document.querySelectorAll('.check-ingrediente').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const alvo = e.target.closest('label').querySelector('.texto-check-alvo');
        if (e.target.checked) {
          alvo.classList.add('item-check-concluido');
        } else {
          alvo.classList.remove('item-check-concluido');
        }
        atualizarContadorChecklist();
      });
    });
    atualizarContadorChecklist();

    // Passo a Passo Recalculado com Checklist Interativo
    const listaPassos = document.getElementById('listaPassoAPasso');
    listaPassos.innerHTML = dados.passoAPasso
      .map(
        (p, idx) => `
        <li class="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition">
          <label class="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" class="check-passo accent-[#1A2332] w-4 h-4 mt-1 shrink-0" />
            <span class="texto-passo-alvo leading-relaxed">
              <strong class="text-[#1A2332] mr-1">${idx + 1}.</strong>${p}
            </span>
          </label>
        </li>
      `
      )
      .join('');

    document.querySelectorAll('.check-passo').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const alvo = e.target.closest('label').querySelector('.texto-passo-alvo');
        if (e.target.checked) {
          alvo.classList.add('item-check-concluido');
        } else {
          alvo.classList.remove('item-check-concluido');
        }
      });
    });

    // Avisos de Impacto
    const listaAvisos = document.getElementById('listaAvisosImpacto');
    listaAvisos.innerHTML = dados.avisosImpacto
      .map(
        (aviso) => `
        <li class="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-950 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
          <span class="text-[#C2410C] font-bold">⚠️</span>
          <span>${aviso}</span>
        </li>
      `
      )
      .join('');

    // Tabela "O que mudou"
    const tabelaBody = document.getElementById('tabelaMudancasBody');
    if (dados.oQueMudou.length === 0) {
      tabelaBody.innerHTML = `
        <tr>
          <td colspan="3" class="py-4 px-4 text-center text-slate-400">Nenhuma substituição ou conversão solicitada.</td>
        </tr>
      `;
    } else {
      tabelaBody.innerHTML = dados.oQueMudou
        .map(
          (m) => `
          <tr class="hover:bg-slate-50/80">
            <td class="py-3 px-4 text-slate-600 line-through">${m.original}</td>
            <td class="py-3 px-4 font-semibold text-[#C2410C]">${m.adaptado}</td>
            <td class="py-3 px-4 text-slate-700">${m.motivo}</td>
          </tr>
        `
        )
        .join('');
    }

    // JSON Bruto
    document.getElementById('jsonBrutoOutput').textContent = JSON.stringify(dados, null, 2);

    secaoResultado.classList.remove('hidden');
    secaoResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  inicializar();
});
