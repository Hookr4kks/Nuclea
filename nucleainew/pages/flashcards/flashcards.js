// pages\flashcards\flashcards.js — NucleaAI (extraído verbatim do source original)
function fcStepQtd(dir) {
  var cur = S.fcConfig.qtd;
  var next = Math.min(10, Math.max(3, cur + dir));
  S.fcConfig.qtd = next;
  document.getElementById('fc-qtd-inline').textContent = next;
  var rng = document.getElementById('fc-qtd-range');
  var val = document.getElementById('fc-qtd-val');
  if (rng) rng.value = next;
  if (val) val.textContent = next;
  saveLS();
}

function fcSetDif(btn) {
  S.fcConfig.dif = btn.dataset.v;
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
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
  S.fcConfig.dif = val;
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) {
    b.classList.toggle('active', b.dataset.v === val);
  });
}

async function genFC() {
  var tema = document.getElementById('fc-tema').value.trim();
  if (!tema) { showToast('Digite um tema!', 'err'); return; }
  var btn = document.getElementById('btn-gen');
  btn.disabled = true; btn.textContent = '⏳ Gerando...';
  setStage('<div class="empty"><div class="empty-ic"><svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="4" y="10" width="30" height="22" rx="3" stroke="currentColor" stroke-width="2" fill="none" opacity="0.35"/><rect x="8" y="6" width="30" height="22" rx="3" stroke="currentColor" stroke-width="2" fill="none" opacity="0.6"/><rect x="12" y="14" width="28" height="20" rx="3" stroke="currentColor" stroke-width="2" fill="var(--bg2)"/></svg></div><strong>Gerando flashcards...</strong></div>');
  var cfg = S.fcConfig;
  var qtd = Math.min(cfg.qtd, 10);
  var dif = cfg.dif;
  var usaD = cfg.tipoDireto;
  var usaM = cfg.tipoMC;
  if (!usaD && !usaM) {
    showToast('Selecione ao menos um tipo nas configurações.', 'err');
    btn.disabled = false; btn.textContent = '⚡ Gerar com IA'; return;
  }
  var nDir = 0, nMC = 0;
  if (usaD && usaM) { nMC = Math.floor(qtd / 2); nDir = qtd - nMC; }
  else if (usaD) { nDir = qtd; }
  else { nMC = qtd; }
  var letrasRotacao = ['C','A','D','B','D','A','C','B','C','D'];
  async function gerarSubtopicos(n) {
    var raw = await callAI('Liste EXATAMENTE ' + n + ' subtópicos DIFERENTES e ESPECÍFICOS do tema "' + tema + '".\nCada subtópico deve ser um aspecto, conceito ou faceta distinta.\nResponda SOMENTE com um array JSON de strings:\n["subtópico 1","subtópico 2",...]');
    var clean = raw.replace(/```json|```/gi, '').trim();
    var s = clean.indexOf('['), e = clean.lastIndexOf(']');
    if (s === -1 || e === -1) return null;
    try { var arr = JSON.parse(clean.slice(s, e + 1)); return Array.isArray(arr) ? arr : null; }
    catch(e) { return null; }
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
  function parseCard(raw) {
    var clean = raw.replace(/```json|```/gi, '').trim();
    var s = clean.search(/[\[{]/), e = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
    if (s === -1 || e === -1) throw new Error('JSON inválido');
    clean = clean.slice(s, e + 1);
    if (clean.startsWith('[')) { var arr = JSON.parse(clean); return Array.isArray(arr) ? arr[0] : arr; }
    return JSON.parse(clean);
  }
  S._fcGeradas = [];
  var allCards = [];
  var total = nDir + nMC;
  try {
    setStage('<div class="empty"><strong>Mapeando subtópicos de "' + tema + '"...</strong></div>');
    var subtopicos = await gerarSubtopicos(total);
    if (!subtopicos || subtopicos.length < total) {
      subtopicos = [];
      for (var i = 0; i < total; i++) subtopicos.push('aspecto ' + (i+1) + ' de ' + tema);
    }
    subtopicos = subtopicos.sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < nDir; i++) {
      setStage('<div class="empty"><strong>Gerando carta ' + (allCards.length+1) + ' de ' + total + '...</strong></div>');
      var evitar = S._fcGeradas.length ? '\nNÃO crie perguntas similares a: ' + S._fcGeradas.slice(-8).join(' | ') : '';
      var prompt = 'Tema geral: "' + tema + '"\nSubtópico: "' + subtopicos[i] + '"\n\nINSTRUÇÃO DE NÍVEL:\n' + difLabel(dif,i) + '\n\nREGRAS OBRIGATÓRIAS:\n- Siga RIGOROSAMENTE a instrução de nível acima\n- A pergunta deve ser direta e objetiva\n- A dica deve ajudar sem revelar a resposta\n' + evitar + '\n\nCrie 1 flashcard de PERGUNTA DIRETA.\nSomente este JSON:\n{"tipo":"direto","pergunta":"...","resposta":"...","dica":"..."}';
      var raw = await callAI(prompt);
      var card = parseCard(raw);
      S._fcGeradas.push(card.pergunta.slice(0, 60));
      allCards.push(card);
    }
    for (var i = 0; i < nMC; i++) {
      var si = nDir + i;
      var letra = letrasRotacao[i % letrasRotacao.length];
      setStage('<div class="empty"><strong>Gerando carta ' + (allCards.length+1) + ' de ' + total + '...</strong></div>');
      var evitar = S._fcGeradas.length ? '\nNÃO crie perguntas similares a: ' + S._fcGeradas.slice(-8).join(' | ') : '';
      var prompt = 'Tema geral: "' + tema + '"\nSubtópico: "' + subtopicos[si] + '"\n\nINSTRUÇÃO DE NÍVEL:\n' + difLabel(dif,i) + '\n\nREGRAS OBRIGATÓRIAS:\n- Siga RIGOROSAMENTE a instrução de nível acima\n- Os distratores (alternativas erradas) devem ser plausíveis para o nível escolhido\n- A alternativa correta é ' + letra + '\n' + evitar + '\n\nCrie 1 questão MÚLTIPLA ESCOLHA.\nSomente este JSON:\n{"tipo":"multipla_escolha","pergunta":"...","alternativas":["A) ...","B) ...","C) ...","D) ..."],"resposta_correta":"' + letra + '","resposta":"..."}';
      var raw = await callAI(prompt);
      var card = parseCard(raw);
      S._fcGeradas.push(card.pergunta.slice(0, 60));
      allCards.push(card);
    }
    delete S._fcGeradas;
    allCards = allCards.sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < allCards.length; i++) {
      allCards[i].id = Math.random().toString(36).slice(2, 8);
      allCards[i].tema = tema;
    }
    S.fc = allCards; S.fcIdx = 0; S.fcRev = false;
    if (!S.prog.temas[tema]) S.prog.temas[tema] = { acertos: 0, erros: 0 };
    renderCard();
    showToast('✅ ' + allCards.length + ' flashcards sobre "' + tema + '"!');
    checkAchievements();
  } catch(e) {
    delete S._fcGeradas;
    setStage('<div class="empty"><strong>Erro ao gerar</strong><p>' + e.message + '</p></div>');
    showToast('Erro: ' + e.message, 'err');
  }
  btn.disabled = false; btn.textContent = '⚡ Gerar com IA';
}

function renderCard() {
  if (!S.fc.length) return;
  var i = S.fcIdx, c = S.fc[i];
  var pct = Math.round((i / S.fc.length) * 100);

  // barra de progresso do deck
  var progWrap = document.getElementById('fc-deck-progress');
  var progFill = document.getElementById('fc-deck-bar-fill');
  var progInfo = document.getElementById('fc-deck-info');
  if (progWrap) { progWrap.style.display = 'flex'; }
  if (progFill) progFill.style.width = pct + '%';
  if (progInfo) progInfo.textContent = (i + 1) + ' / ' + S.fc.length;

  var h = '<div class="fc-card' + (S.fcRev ? ' revealed' : '') + '" id="cur-fc">';

  // header
  h += '<div class="fc-card-header">';
  h += '<span class="fc-card-tag">' + c.tema + '</span>';
  h += '<span class="fc-card-type-badge">' + (c.tipo === 'direto' ? 'Pergunta direta' : 'Múltipla escolha') + '</span>';
  h += '</div>';

  // pergunta
  h += '<div class="fc-card-question">' + c.pergunta + '</div>';

  if (c.tipo === 'multipla_escolha') {
    h += '<div class="fc-mc-grid">';
    for (var k = 0; k < c.alternativas.length; k++) {
      var alt = c.alternativas[k], l = alt[0];
      var cls = 'fc-mc-opt';
      if (S.fcRev) {
        if (l === c.resposta_correta) cls += ' ok';
        else if (S.fcSel === l) cls += ' wrong';
      }
      h += '<button class="' + cls + '" onclick="ansMC(\'' + l + '\',\'' + c.id + '\',\'' + c.tema + '\')" ' + (S.fcRev ? 'disabled' : '') + '>' + alt + '</button>';
    }
    h += '</div>';
    if (S.fcRev) {
      h += '<div class="fc-card-answer">💡 ' + c.resposta + '</div>';
    }
  } else {
    if (!S.fcRev) {
      if (c.dica) h += '<div class="fc-card-hint">💡 ' + c.dica + '</div>';
      h += '<div class="fc-card-reveal" onclick="revFC()">👆 Clique para revelar a resposta</div>';
    } else {
      h += '<div class="fc-card-answer">' + c.resposta + '</div>';
      h += '<div class="fc-rating-row">';
      h += '<button class="fc-btn-no"  onclick="rateFC(false,\'' + c.id + '\',\'' + c.tema + '\')">✕ Não sabia</button>';
      h += '<button class="fc-btn-yes" onclick="rateFC(true,\'' + c.id + '\',\'' + c.tema + '\')">✓ Sabia!</button>';
      h += '</div>';
    }
  }

  h += '</div>';
  document.getElementById('fc-stage').innerHTML = h;
}

function revFC() { S.fcRev = true; renderCard(); }
function ansMC(l, id, tema) { var c = S.fc[S.fcIdx]; S.fcRev = true; S.fcSel = l; regTent(l === c.resposta_correta, id, tema); renderCard(); setTimeout(nextFC, 1800); }
function rateFC(ok, id, tema) { regTent(ok, id, tema); nextFC(); }

function regTent(ok, id, tema) {
  S.prog.total++;
  if (!S.prog.temas[tema]) S.prog.temas[tema] = { acertos: 0, erros: 0 };
  if (ok) { S.prog.acertos++; S.prog.temas[tema].acertos++; showToast('✅ Correto!'); }
  else    { S.prog.erros++;   S.prog.temas[tema].erros++;   showToast('❌ Continue!', 'err'); }
  saveLS();
  checkAchievements();
}

function nextFC() {
  S.fcIdx++; S.fcRev = false; S.fcSel = null;
  if (S.fcIdx >= S.fc.length) {
    setStage('<div class="empty"><strong>Deck concluído!</strong><p>Você completou ' + S.fc.length + ' cartões.</p><div style="margin-top:12px;display:flex;gap:7px;justify-content:center"><button class="btn" onclick="resetDeck()">↺ Recomeçar</button><button class="btn pr" onclick="genFC()">⚡ Gerar Mais</button></div></div>');
    showToast('🎉 Deck completo!');
  } else renderCard();
}

function resetDeck() {
  S.fc = []; S.fcIdx = 0; S.fcRev = false;
  var prog = document.getElementById('fc-deck-progress');
  if (prog) prog.style.display = 'none';
  document.getElementById('fc-stage').innerHTML =
    '<div class="fc-empty-state">' +
    '<div class="fc-empty-icon">🃏</div>' +
    '<div class="fc-empty-title">Nenhum flashcard</div>' +
    '<div class="fc-empty-sub">Digite um tema e pressione <strong>Enter</strong> ou clique em Gerar</div>' +
    '</div>';
}
function clearFC() { resetDeck(); S.prog = { total:0, acertos:0, erros:0, temas:{} }; saveLS(); showToast('Flashcards e estatísticas limpos!'); }
function setStage(h) {
  var prog = document.getElementById('fc-deck-progress');
  if (prog) prog.style.display = 'none';
  document.getElementById('fc-stage').innerHTML = h;
}
function goFC(t) {
  document.getElementById('fc-tema').value = t;
  go('flashcards', document.getElementById('n-flashcards'));
}

