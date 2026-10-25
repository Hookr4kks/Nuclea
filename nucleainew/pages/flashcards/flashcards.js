// pages\flashcards\flashcards.js — NucleaAI
// Fluxo em dois estados: "config" (card de configuração) e "session"/"summary" (modo de estudo dedicado).
// escH/setTxt vêm de progresso.js (utilitários globais).

/* ── Controles da configuração ─────────────────────────────────────── */
function fcStepQtd(dir) {
  var cur = S.fcConfig.qtd;
  var next = Math.min(10, Math.max(3, cur + dir));
  S.fcConfig.qtd = next;
  var inl = document.getElementById('fc-qtd-inline');
  if (inl) inl.textContent = next;
  var rng = document.getElementById('fc-qtd-range');
  var val = document.getElementById('fc-qtd-val');
  if (rng) rng.value = next;
  if (val) val.textContent = next;
  saveLS();
}

function fcSyncPills() {
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) {
    b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false');
  });
}

function fcSetDif(btn) {
  S.fcConfig.dif = btn.dataset.v;
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  fcSyncPills();
  document.querySelectorAll('#s-fc .cfg-pill').forEach(function(b) {
    b.classList.toggle('on', b.dataset.v === btn.dataset.v);
  });
  saveLS();
}

function syncFCInlineQtd(val) {
  S.fcConfig.qtd = parseInt(val) || 5;
  var el = document.getElementById('fc-qtd-inline');
  if (el) el.textContent = S.fcConfig.qtd;
}

function syncFCInlineDif(val) {
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) {
    b.classList.toggle('active', b.dataset.v === val);
  });
  fcSyncPills();
}

// applyFCConfig (config.js) roda no boot antes deste evento; sincroniza o aria-pressed.
window.addEventListener('nucleai:pages-loaded', fcSyncPills);

function fcSetError(msg) {
  var el  = document.getElementById('fc-tema-err');
  var inp = document.getElementById('fc-tema');
  if (el) el.textContent = msg || '';
  if (inp) {
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    inp.classList.toggle('fc-input-err', !!msg);
  }
}

function fcSetStatus(msg, kind) {
  var el = document.getElementById('fc-gen-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'fc-gen-status' + (kind ? ' fc-gen-status--' + kind : '');
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
}

function fcSetBusy(busy) {
  var form = document.getElementById('fc-setup-form');
  var btn  = document.getElementById('btn-gen');
  if (!form) return;
  form.classList.toggle('is-busy', busy);
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
  form.querySelectorAll('input, button').forEach(function(el) { el.disabled = busy; });
  if (btn) btn.textContent = busy ? 'Gerando…' : 'Iniciar sessão';
}

/* ── Estados da página ─────────────────────────────────────────────── */
function fcShowState(state) {
  S.fcMode = state; // 'config' | 'session' | 'summary'
  var setup = document.getElementById('fc-setup');
  var sess  = document.getElementById('fc-session');
  if (setup) setup.hidden = (state !== 'config');
  if (sess) {
    sess.hidden = (state === 'config');
    sess.classList.toggle('is-summary', state === 'summary');
  }
  if (state === 'config') {
    var stage = document.getElementById('fc-stage');
    if (stage) stage.innerHTML = '';
  }
}

function setStage(h) {
  var stage = document.getElementById('fc-stage');
  if (stage) stage.innerHTML = h;
}

/* ── Geração (integração com a IA preservada) ──────────────────────── */
function fcParseCard(raw) {
  var clean = raw.replace(/```json|```/gi, '').trim();
  var s = clean.search(/[\[{]/), e = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (s === -1 || e === -1) throw new Error('JSON inválido');
  clean = clean.slice(s, e + 1);
  if (clean.charAt(0) === '[') { var arr = JSON.parse(clean); return Array.isArray(arr) ? arr[0] : arr; }
  return JSON.parse(clean);
}

// Valida/normaliza o cartão devolvido pela IA; devolve null se estiver inutilizável.
function fcNormalizeCard(card, tipo) {
  if (!card || typeof card !== 'object') return null;
  var pergunta = typeof card.pergunta === 'string' ? card.pergunta.trim() : '';
  var resposta = typeof card.resposta === 'string' ? card.resposta.trim() : '';
  if (!pergunta) return null;
  if (tipo === 'direto') {
    if (!resposta) return null;
    return { tipo: 'direto', pergunta: pergunta, resposta: resposta, dica: typeof card.dica === 'string' ? card.dica.trim() : '' };
  }
  var alts = Array.isArray(card.alternativas) ? card.alternativas : [];
  if (alts.length < 2) return null;
  var letras = ['A','B','C','D','E','F'];
  alts = alts.map(function(a, i) {
    var s = String(a).trim();
    return /^[A-F]\)/i.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : letras[i] + ') ' + s;
  });
  var correta = String(card.resposta_correta || '').trim().charAt(0).toUpperCase();
  var existe = alts.some(function(a) { return a.charAt(0) === correta; });
  if (!existe) return null;
  return { tipo: 'multipla_escolha', pergunta: pergunta, alternativas: alts, resposta_correta: correta, resposta: resposta };
}

// Até 2 tentativas por cartão quando a IA responde fora do formato; erros de rede/IA sobem direto.
async function fcGerarCarta(prompt, tipo) {
  for (var tent = 0; tent < 2; tent++) {
    var raw = await callAI(prompt);
    try {
      var card = fcNormalizeCard(fcParseCard(raw), tipo);
      if (card) return card;
    } catch(e) { /* tenta de novo */ }
  }
  throw new Error('A IA devolveu um flashcard em formato inválido. Tente novamente.');
}

async function genFC() {
  if (S._fcBusy) return; // nunca duas gerações ao mesmo tempo
  var temaEl = document.getElementById('fc-tema');
  var tema = temaEl ? temaEl.value.trim() : '';
  fcSetError('');
  fcSetStatus('');
  if (!tema) {
    fcSetError('Digite o tema que você quer estudar.');
    if (temaEl) temaEl.focus();
    return;
  }
  var cfg = S.fcConfig;
  var qtd = Math.min(cfg.qtd, 10);
  var dif = cfg.dif;
  var usaD = cfg.tipoDireto;
  var usaM = cfg.tipoMC;
  if (!usaD && !usaM) {
    fcSetStatus('Ative ao menos um tipo de pergunta em Configurações → Flashcards.', 'err');
    showToast('Selecione ao menos um tipo nas configurações.', 'err');
    return;
  }
  var nDir = 0, nMC = 0;
  if (usaD && usaM) { nMC = Math.floor(qtd / 2); nDir = qtd - nMC; }
  else if (usaD) { nDir = qtd; }
  else { nMC = qtd; }

  S._fcBusy = true;
  fcSetBusy(true);
  fcSetStatus('Mapeando subtópicos de "' + tema + '"…', 'busy');

  var letrasRotacao = ['C','A','D','B','D','A','C','B','C','D'];
  async function gerarSubtopicos(n) {
    var raw = await callAI('Liste EXATAMENTE ' + n + ' subtópicos DIFERENTES e ESPECÍFICOS do tema "' + tema + '".\nCada subtópico deve ser um aspecto, conceito ou faceta distinta.\nResponda SOMENTE com um array JSON de strings:\n["subtópico 1","subtópico 2",...]');
    var clean = raw.replace(/```json|```/gi, '').trim();
    var s = clean.indexOf('['), e = clean.lastIndexOf(']');
    if (s === -1 || e === -1) return null;
    try { var arr = JSON.parse(clean.slice(s, e + 1)); return Array.isArray(arr) ? arr : null; }
    catch(err) { return null; }
  }
  function difLabel(d, idx) {
    var instrucoes = {
      basico: 'Nível BÁSICO: a pergunta deve ser respondível por QUALQUER PESSOA. QUALQUER PESSOA MESMO, FAÇA PERGUNTAS COMO SE O USUARIO FOSSE UMA CRIANÇA DE DEZ ANOS SEM CONHECIMENTO DO MUNDO ;Em que continente fica o Brasil?".',
      intermediario: 'Nível INTERMEDIÁRIO: a pergunta requer conhecimento específico de quem já estudou ou tem familiaridade com o tema. Não pode ser respondida por intuição ou senso comum. FAÇA PERGUNTAS MEDIANAS, COM UMA DIFICULDADE MINIMA, QUASE NULA, QUE SEJAM PERGUNTAS NEM TAO FACEIS MENOS AINDA DIFICEIS Exemplo: conceitos, processos ou relações não triviais do assunto.',
      avancado: 'Nível AVANÇADO: a pergunta exige domínio aprofundado do tema. Deve envolver detalhes técnicos, exceções, mecanismos complexos ou análise crítica. Apenas especialistas ou quem estudou extensivamente consegue responder.'
    };
    if (d === 'misto') {
      var niveis = ['basico','intermediario','avancado'];
      return instrucoes[niveis[idx % 3]];
    }
    return instrucoes[d] || instrucoes.intermediario;
  }

  S._fcGeradas = [];
  var allCards = [];
  var total = nDir + nMC;
  try {
    var subtopicos = await gerarSubtopicos(total);
    if (!subtopicos || subtopicos.length < total) {
      subtopicos = [];
      for (var i = 0; i < total; i++) subtopicos.push('aspecto ' + (i+1) + ' de ' + tema);
    }
    subtopicos = subtopicos.sort(function() { return Math.random() - 0.5; });

    for (var d = 0; d < nDir; d++) {
      fcSetStatus('Gerando carta ' + (allCards.length + 1) + ' de ' + total + '…', 'busy');
      var evitarD = S._fcGeradas.length ? '\nNÃO crie perguntas similares a: ' + S._fcGeradas.slice(-8).join(' | ') : '';
      var promptD = 'Tema geral: "' + tema + '"\nSubtópico: "' + subtopicos[d] + '"\n\nINSTRUÇÃO DE NÍVEL:\n' + difLabel(dif, d) + '\n\nREGRAS OBRIGATÓRIAS:\n- Siga RIGOROSAMENTE a instrução de nível acima\n- A pergunta deve ser direta e objetiva\n- A dica deve ajudar sem revelar a resposta\n' + evitarD + '\n\nCrie 1 flashcard de PERGUNTA DIRETA.\nSomente este JSON:\n{"tipo":"direto","pergunta":"...","resposta":"...","dica":"..."}';
      var cardD = await fcGerarCarta(promptD, 'direto');
      S._fcGeradas.push(cardD.pergunta.slice(0, 60));
      allCards.push(cardD);
    }
    for (var m = 0; m < nMC; m++) {
      var si = nDir + m;
      var letra = letrasRotacao[m % letrasRotacao.length];
      fcSetStatus('Gerando carta ' + (allCards.length + 1) + ' de ' + total + '…', 'busy');
      var evitarM = S._fcGeradas.length ? '\nNÃO crie perguntas similares a: ' + S._fcGeradas.slice(-8).join(' | ') : '';
      var promptM = 'Tema geral: "' + tema + '"\nSubtópico: "' + subtopicos[si] + '"\n\nINSTRUÇÃO DE NÍVEL:\n' + difLabel(dif, m) + '\n\nREGRAS OBRIGATÓRIAS:\n- Siga RIGOROSAMENTE a instrução de nível acima\n- Os distratores (alternativas erradas) devem ser plausíveis para o nível escolhido\n- A alternativa correta é ' + letra + '\n' + evitarM + '\n\nCrie 1 questão MÚLTIPLA ESCOLHA.\nSomente este JSON:\n{"tipo":"multipla_escolha","pergunta":"...","alternativas":["A) ...","B) ...","C) ...","D) ..."],"resposta_correta":"' + letra + '","resposta":"..."}';
      var cardM = await fcGerarCarta(promptM, 'multipla_escolha');
      S._fcGeradas.push(cardM.pergunta.slice(0, 60));
      allCards.push(cardM);
    }
    delete S._fcGeradas;
    allCards = allCards.sort(function() { return Math.random() - 0.5; });
    for (var k = 0; k < allCards.length; k++) {
      allCards[k].id = Math.random().toString(36).slice(2, 8);
      allCards[k].tema = tema;
    }
    S.fc = allCards; S.fcIdx = 0; S.fcRev = false; S.fcSel = null;
    S.fcSession = { tema: tema, total: allCards.length, acertos: 0, erros: 0, puladas: 0 };
    if (!S.prog.temas[tema]) S.prog.temas[tema] = { acertos: 0, erros: 0 };
    fcSetStatus('');
    fcShowState('session');
    renderCard();
    showToast('✅ ' + allCards.length + ' flashcards sobre "' + tema + '"!');
    checkAchievements();
  } catch(e) {
    delete S._fcGeradas;
    fcSetStatus('Não foi possível gerar os flashcards: ' + e.message, 'err');
    showToast('Erro: ' + e.message, 'err');
  } finally {
    S._fcBusy = false;
    fcSetBusy(false);
  }
}

/* ── Sessão ────────────────────────────────────────────────────────── */
function fcUpdateHeader() {
  var total = S.fc.length;
  var ses = S.fcSession || { acertos: 0, erros: 0, puladas: 0, tema: '' };
  var feitos = ses.acertos + ses.erros + ses.puladas;
  var pct = total ? Math.min(100, Math.round((feitos / total) * 100)) : 0;
  var atual = Math.min(S.fcIdx, Math.max(total - 1, 0)) + 1;
  setTxt('fc-deck-info', 'Card ' + atual + ' de ' + total);
  setTxt('fc-session-theme', ses.tema || '');
  var fill = document.getElementById('fc-deck-bar-fill');
  var bar  = document.getElementById('fc-deck-bar');
  if (fill) fill.style.width = pct + '%';
  if (bar)  bar.setAttribute('aria-valuenow', String(pct));
}

function renderCard() {
  if (!S.fc.length || !S.fc[S.fcIdx]) return;
  var c = S.fc[S.fcIdx];
  fcUpdateHeader();

  var h = '<div class="fc-card' + (S.fcRev ? ' revealed' : '') + '" id="cur-fc">';
  h += '<div class="fc-card-header">';
  h += '<span class="fc-card-tag">' + escH(c.tema) + '</span>';
  h += '<span class="fc-card-type-badge">' + (c.tipo === 'direto' ? 'Pergunta direta' : 'Múltipla escolha') + '</span>';
  h += '</div>';
  h += '<div class="fc-card-question">' + escH(c.pergunta) + '</div>';

  if (c.tipo === 'multipla_escolha') {
    h += '<div class="fc-mc-grid">';
    for (var k = 0; k < c.alternativas.length; k++) {
      var alt = c.alternativas[k], l = alt.charAt(0);
      var cls = 'fc-mc-opt';
      if (S.fcRev) {
        if (l === c.resposta_correta) cls += ' ok';
        else if (S.fcSel === l) cls += ' wrong';
      }
      h += '<button type="button" class="' + cls + '" onclick="ansMC(\'' + l + '\')" ' + (S.fcRev ? 'disabled' : '') + '>' + escH(alt) + '</button>';
    }
    h += '</div>';
    if (S.fcRev) {
      var acertou = S.fcSel === c.resposta_correta;
      h += '<div class="fc-card-feedback ' + (acertou ? 'fc-card-feedback--ok' : 'fc-card-feedback--no') + '">' +
           (acertou ? '✓ Correto!' : '✕ Resposta correta: ' + escH(c.resposta_correta)) + '</div>';
      if (c.resposta) h += '<div class="fc-card-answer">💡 ' + escH(c.resposta) + '</div>';
    }
  } else {
    if (!S.fcRev) {
      if (c.dica) h += '<div class="fc-card-hint">💡 ' + escH(c.dica) + '</div>';
      h += '<button type="button" class="fc-card-reveal" onclick="revFC()">Mostrar resposta</button>';
    } else {
      h += '<div class="fc-card-answer">' + escH(c.resposta) + '</div>';
      h += '<div class="fc-rating-row">';
      h += '<button type="button" class="fc-btn-no"  onclick="rateFC(false)">✕ Não sabia</button>';
      h += '<button type="button" class="fc-btn-yes" onclick="rateFC(true)">✓ Sabia!</button>';
      h += '</div>';
    }
  }
  h += '</div>';

  // Navegação: pular enquanto não respondeu; avançar depois de responder uma múltipla escolha
  h += '<div class="fc-nav">';
  if (c.tipo === 'multipla_escolha' && S.fcRev) {
    var ultimo = S.fcIdx >= S.fc.length - 1;
    h += '<button type="button" class="btn pr fc-nav-next" onclick="nextFC()">' + (ultimo ? 'Ver resumo' : 'Próximo card →') + '</button>';
  } else {
    h += '<button type="button" class="btn fc-nav-skip" onclick="skipFC()">Pular →</button>';
  }
  h += '</div>';

  setStage(h);
}

function revFC() { S.fcRev = true; renderCard(); }

function ansMC(l) {
  var c = S.fc[S.fcIdx];
  if (!c || S.fcRev) return; // evita contar a mesma resposta duas vezes
  S.fcRev = true; S.fcSel = l;
  regTent(l === c.resposta_correta, c.id, c.tema);
  renderCard();
}

function rateFC(ok) {
  var c = S.fc[S.fcIdx];
  if (!c) return;
  regTent(ok, c.id, c.tema);
  nextFC();
}

function skipFC() {
  if (S.fcSession) S.fcSession.puladas++;
  nextFC();
}

function regTent(ok, id, tema) {
  S.prog.total++;
  if (!S.prog.temas[tema]) S.prog.temas[tema] = { acertos: 0, erros: 0 };
  if (ok) { S.prog.acertos++; S.prog.temas[tema].acertos++; showToast('✅ Correto!'); }
  else    { S.prog.erros++;   S.prog.temas[tema].erros++;   showToast('❌ Continue!', 'err'); }
  if (S.fcSession) { if (ok) S.fcSession.acertos++; else S.fcSession.erros++; }
  saveLS();
  checkAchievements();
}

function nextFC() {
  S.fcIdx++; S.fcRev = false; S.fcSel = null;
  if (S.fcIdx >= S.fc.length) fcFinish();
  else renderCard();
}

function fcFinish() {
  var ses = S.fcSession || { tema: '', total: S.fc.length, acertos: 0, erros: 0, puladas: 0 };
  var resp = ses.acertos + ses.erros;
  var taxa = resp > 0 ? Math.round((ses.acertos / resp) * 100) + '%' : '—';
  fcShowState('summary');
  setStage(
    '<div class="fc-summary">' +
      '<div class="fc-summary-ic" aria-hidden="true">🎉</div>' +
      '<h2 class="fc-summary-title">Sessão concluída</h2>' +
      '<p class="fc-summary-sub">Tema: <strong>' + escH(ses.tema) + '</strong></p>' +
      '<div class="fc-summary-stats">' +
        '<div class="fc-sum-stat"><span class="fc-sum-val">' + ses.total + '</span><span class="fc-sum-lbl">Cartões</span></div>' +
        '<div class="fc-sum-stat"><span class="fc-sum-val fc-sum-val--gn">' + ses.acertos + '</span><span class="fc-sum-lbl">Acertos</span></div>' +
        '<div class="fc-sum-stat"><span class="fc-sum-val fc-sum-val--rd">' + ses.erros + '</span><span class="fc-sum-lbl">Erros</span></div>' +
        '<div class="fc-sum-stat"><span class="fc-sum-val">' + ses.puladas + '</span><span class="fc-sum-lbl">Puladas</span></div>' +
        '<div class="fc-sum-stat fc-sum-stat--wide"><span class="fc-sum-val fc-sum-val--yw">' + taxa + '</span><span class="fc-sum-lbl">Taxa de acerto da sessão</span></div>' +
      '</div>' +
      '<div class="fc-summary-actions">' +
        '<button type="button" class="btn" onclick="resetDeck()">Voltar à configuração</button>' +
        '<button type="button" class="btn pr" onclick="fcPlayAgain()">Nova sessão do mesmo tema</button>' +
      '</div>' +
    '</div>'
  );
  showToast('🎉 Sessão completa!');
}

// Encerra a sessão em andamento. As respostas já registradas continuam no progresso.
function fcExitSession() {
  if (S.fcMode === 'session' && S.fc.length && S.fcIdx < S.fc.length) {
    if (!confirm('Encerrar a sessão agora? As respostas já registradas continuam no seu progresso.')) return;
  }
  resetDeck();
}

function fcPlayAgain() {
  resetDeck();
  genFC();
}

function resetDeck() {
  S.fc = []; S.fcIdx = 0; S.fcRev = false; S.fcSel = null; S.fcSession = null;
  fcShowState('config');
}

function clearFC() { resetDeck(); S.prog = { total:0, acertos:0, erros:0, temas:{} }; saveLS(); showToast('Flashcards e estatísticas limpos!'); }

function goFC(t) {
  var inp = document.getElementById('fc-tema');
  if (S.fcMode === 'summary') resetDeck();
  if (inp) inp.value = t;
  if (S.fcMode === 'session') showToast('Termine ou encerre a sessão atual para estudar "' + t + '".');
  go('flashcards', document.getElementById('n-flashcards'));
}
