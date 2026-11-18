/**
 * Script da Interface Web - Receita Adaptada
 */

document.addEventListener('DOMContentLoaded', () => {
  const campoReceitaOriginal = document.getElementById('campoReceitaOriginal');
  const contadorCaracteres = document.getElementById('contadorCaracteres');
  const selectConversao = document.getElementById('selectConversao');
  const inputSubstituir = document.getElementById('inputSubstituir');
  const inputPorcoesOriginais = document.getElementById('inputPorcoesOriginais');
  const inputPorcoesDesejadas = document.getElementById('inputPorcoesDesejadas');
  const formAdaptar = document.getElementById('formAdaptar');
  const btnSubmeter = document.getElementById('btnSubmeter');
  const textoBotaoSubmeter = document.getElementById('textoBotaoSubmeter');

  const btnExemploCenoura = document.getElementById('btnExemploCenoura');
  const btnExemploPaoDeLo = document.getElementById('btnExemploPaoDeLo');
  const btnLimpar = document.getElementById('btnLimpar');

  const alertaErro = document.getElementById('alertaErro');
  const mensagemErro = document.getElementById('mensagemErro');
  const btnFecharErro = document.getElementById('btnFecharErro');

  const secaoResultado = document.getElementById('secaoResultado');
  const statusBadge = document.getElementById('statusBadge');
  const versaoPromptPill = document.getElementById('versaoPromptPill');

  const modalDensidades = document.getElementById('modalDensidades');
  const btnAbrirDensidades = document.getElementById('btnAbrirDensidades');
  const btnFecharDensidades = document.getElementById('btnFecharDensidades');
  const tabelaDensidadesBody = document.getElementById('tabelaDensidadesBody');

  let cacheExemplos = {};

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

  // Carregar status inicial e exemplos
  async function inicializar() {
    try {
      const [resStatus, resExemplos, resDensidades] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/exemplos'),
        fetch('/api/densidades'),
      ]);

      if (resStatus.ok) {
        const status = await resStatus.json();
        versaoPromptPill.textContent = `Prompt v${status.versaoPrompt}`;
        if (status.geminiConfigurado) {
          statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span>Gemini API Conectada</span>`;
        } else {
          statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#F39200]"></span><span>Modo Local + Conversor TS</span>`;
        }
      }

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

    const checkboxes = document.querySelectorAll('input[name="restricoes"]');
    checkboxes.forEach((cb) => {
      cb.checked = Array.isArray(ex.restricoes) && ex.restricoes.includes(cb.value);
    });

    atualizarContador();
  }

  btnExemploCenoura.addEventListener('click', () => preencherExemplo('bolo_cenoura'));
  btnExemploPaoDeLo.addEventListener('click', () => preencherExemplo('pao_de_lo'));

  btnLimpar.addEventListener('click', () => {
    campoReceitaOriginal.value = '';
    inputSubstituir.value = '';
    inputPorcoesOriginais.value = '';
    inputPorcoesDesejadas.value = '';
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
      const resposta = await fetch('/api/adaptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await resposta.json();
      if (!resposta.ok || !json.sucesso) {
        throw new Error(json.detalhes || json.erro || 'Falha ao adaptar a receita.');
      }

      renderizarResultado(receitaOriginal, json.dados);
    } catch (err) {
      mostrarErro(err.message || 'Erro de comunicação com o servidor.');
    } finally {
      btnSubmeter.disabled = false;
      textoBotaoSubmeter.textContent = 'Adaptar Receita Agora';
    }
  });

  function renderizarResultado(receitaOriginalTexto, dados) {
    document.getElementById('tituloReceitaAdaptada').textContent = dados.tituloReceita;
    document.getElementById('badgeRendimento').textContent = `Rendimento: ${dados.porcoesOriginais} ➔ ${dados.porcoesFinais} porções (${dados.fatorEscala}x)`;
    document.getElementById('badgeCalculoCodigo').textContent = `${dados.metadadosConversao.itensCalculadosEmCodigo} ingredientes calculados em código TS`;

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

    // Lista de Ingredientes Adaptada
    const listaIng = document.getElementById('listaIngredientesAdaptados');
    listaIng.innerHTML = dados.ingredientesAdaptados
      .map((ing) => {
        const badgeSub = ing.foiSubstituido
          ? `<span class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-[#C2410C]">
               <span class="w-1.5 h-1.5 rounded-full bg-[#F39200]"></span>Substituído
             </span>`
          : '';
        const obs = ing.observacao
          ? `<span class="block text-xs text-slate-500 mt-0.5 italic">Obs: ${ing.observacao}</span>`
          : '';
        return `
          <li class="p-2.5 rounded-xl ${
            ing.foiSubstituido ? 'bg-orange-50/70 border border-orange-200/70' : 'bg-[#F4F6F9]'
          }">
            <div class="flex flex-wrap items-baseline justify-between gap-1">
              <div>
                <strong class="text-[#1A2332] font-bold">${ing.quantidadeFormatada}</strong>
                <span class="text-slate-800"> de ${ing.nome}</span>
                ${badgeSub}
              </div>
            </div>
            ${obs}
          </li>
        `;
      })
      .join('');

    // Passo a Passo Recalculado
    const listaPassos = document.getElementById('listaPassoAPasso');
    listaPassos.innerHTML = dados.passoAPasso
      .map((p) => `<li class="leading-relaxed pl-1">${p}</li>`)
      .join('');

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
