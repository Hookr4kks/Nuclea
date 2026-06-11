function openMobSb() {
  document.getElementById('sb').classList.add('mob-open');
  document.getElementById('sb-overlay').classList.add('mob-open');
}
function closeMobSb() {
  document.getElementById('sb').classList.remove('mob-open');
  document.getElementById('sb-overlay').classList.remove('mob-open');
}

var S = {
  apiKey: '',
  model: 'open-mixtral-8x7b',
  chatSessions: [],
  currentSessionId: null,
  chatHist: [],
  fc: [], fcIdx: 0, fcRev: false, fcSel: null,
  prog: { total: 0, acertos: 0, erros: 0, temas: {} },
  tasks: [],
  events: {},
  calY: 0, calM: 0, selDate: '',
  selColor: '#6c8ef5',
  dpY: 0, dpM: 0, dpSel: '',
  aiConfig: { nome: 'Núclea', tom: 'didatico', idioma: 'pt-BR', extra: '' },
  fcConfig: { qtd: 5, dif: 'basico', tipoDireto: true, tipoMC: true },
  elConfig: { key: '', voiceId: '', motor: 'browser', lang: 2 },
};

try {
  if (typeof CONFIG !== 'undefined' && CONFIG.MISTRAL_API_KEY && CONFIG.MISTRAL_API_KEY !== 'SUA_CHAVE_AQUI') {
    S.apiKey = CONFIG.MISTRAL_API_KEY;
    S.model = CONFIG.MISTRAL_MODEL || 'open-mixtral-8x7b';
  }
} catch(e) {}

var today = new Date();
var chatImage = null;
S.calY = today.getFullYear();
S.calM = today.getMonth();
S.selDate = today.toISOString().split('T')[0];
S.dpY = S.calY;
S.dpM = S.calM;

var MOS  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MOS3 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var DYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var PIN_COLORS = ['#6c8ef5','#4ade80','#f87171','#fbbf24','#a78bfa'];

function saveLS() {
  try {
    localStorage.setItem('fl_chats',    JSON.stringify(S.chatSessions));
    localStorage.setItem('fl_tasks',    JSON.stringify(S.tasks));
    localStorage.setItem('fl_events',   JSON.stringify(S.events));
    localStorage.setItem('fl_prog',     JSON.stringify(S.prog));
    localStorage.setItem('fl_aiConfig', JSON.stringify(S.aiConfig));
    localStorage.setItem('fl_fcConfig', JSON.stringify(S.fcConfig));
    localStorage.setItem('fl_elConfig', JSON.stringify(S.elConfig));
  } catch(e) {}
}

function loadLS() {
  try {
    var raw;
    raw = localStorage.getItem('fl_chats');
    if (raw) { try { S.chatSessions = JSON.parse(raw); } catch(e) { S.chatSessions = []; } }
    raw = localStorage.getItem('fl_tasks');
    if (raw) { try { S.tasks = JSON.parse(raw); } catch(e) { S.tasks = []; } }
    raw = localStorage.getItem('fl_events');
    if (raw) { try { S.events = JSON.parse(raw); } catch(e) { S.events = {}; } }
    raw = localStorage.getItem('fl_prog');
    if (raw) { try { S.prog = JSON.parse(raw); } catch(e) {} }
    raw = localStorage.getItem('fl_aiConfig');
    if (raw) { try { var ai = JSON.parse(raw); S.aiConfig = { nome:'Núclea', tom:'didatico', idioma:'pt-BR', extra:'', ...ai }; } catch(e) {} }
    raw = localStorage.getItem('fl_fcConfig');
    if (raw) { try { var fc = JSON.parse(raw); S.fcConfig = { qtd:5, dif:'basico', tipoDireto:true, tipoMC:true, ...fc }; } catch(e) {} }
    raw = localStorage.getItem('fl_elConfig');
    if (raw) { try { var el = JSON.parse(raw); S.elConfig = { key:'', voiceId:'', motor:'browser', lang:2, ...el }; } catch(e) {} }
  } catch(e) {}
}

function go(id, btn) {
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
  document.querySelectorAll('.nav-i[id^="n-"]').forEach(function(b) { b.classList.remove('on'); });
  document.getElementById('p-' + id).classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'progresso')  renderProg();
  if (id === 'agenda')     renderCal();
  if (id === 'tarefas')    renderTasks();
  if (id === 'historico')  renderHistorico('');
  if (id === 'conquistas') renderConquistas();
  if (id !== 'voz')        vozStop();
  closeDatePick();
}

function toggleSb() { document.getElementById('sb').classList.toggle('col'); }

function showToast(msg, type) {
  type = type || 'ok';
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function fmtTs(ts) {
  if (!ts) return '';
  var d = new Date(ts), hoje = new Date(), diff = hoje - d;
  if (diff < 60000)    return 'agora';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'min atrás';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h atrás';
  return d.getDate() + ' ' + MOS3[d.getMonth()];
}

function renderHistorico(filtro) {
  if (filtro === undefined || filtro === null) filtro = '';
  var list = document.getElementById('hist-list');
  if (!list) return;
  var sessions;
  if (filtro === '') {
    sessions = S.chatSessions;
  } else {
    var f = filtro.toLowerCase();
    sessions = [];
    for (var i = 0; i < S.chatSessions.length; i++) {
      var s = S.chatSessions[i];
      var match = s.title.toLowerCase().indexOf(f) !== -1;
      if (!match) {
        for (var j = 0; j < s.hist.length; j++) {
          if (s.hist[j].content.toLowerCase().indexOf(f) !== -1) { match = true; break; }
        }
      }
      if (match) sessions.push(s);
    }
  }
  if (sessions.length === 0) {
    list.innerHTML = '';
    var empty = document.createElement('div');
    empty.className = 'hist-empty';
    empty.innerHTML = filtro ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa salva ainda.<br>Inicie um chat e ele aparecerá aqui.';
    list.appendChild(empty);
    return;
  }
  list.innerHTML = '';
  var grid = document.createElement('div');
  grid.className = 'hist-grid';
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var card = document.createElement('div');
    card.className = 'hist-card' + (s.id === S.currentSessionId ? ' hist-active' : '');
    var top = document.createElement('div');
    top.className = 'hist-card-top';
    var titleEl = document.createElement('div');
    titleEl.className = 'hist-card-title';
    titleEl.textContent = s.title || 'Conversa';
    var meta = document.createElement('div');
    meta.className = 'hist-card-meta';
    var dateEl = document.createElement('span');
    dateEl.className = 'hist-card-date';
    dateEl.textContent = fmtTs(s.ts);
    var delBtn = document.createElement('button');
    delBtn.className = 'hist-card-menu';
    delBtn.textContent = '⋯';
    delBtn.title = 'Apagar';
    (function(sid) { delBtn.onclick = function(e) { e.stopPropagation(); deleteSession(sid); }; })(s.id);
    meta.appendChild(dateEl);
    meta.appendChild(delBtn);
    top.appendChild(titleEl);
    top.appendChild(meta);
    var preview = document.createElement('div');
    preview.className = 'hist-card-preview';
    var msgs = s.hist ? s.hist.slice(0, 2) : [];
    for (var j = 0; j < msgs.length; j++) {
      var m = msgs[j];
      var line = document.createElement('div');
      line.className = 'hist-preview-line';
      var roleEl = document.createElement('span');
      roleEl.className = 'hist-preview-role';
      roleEl.textContent = (m.role === 'user' ? 'Você' : (S.aiConfig.nome || 'IA')) + ': ';
      var content = m.content || '';
      var txt = document.createTextNode(content.slice(0, 90) + (content.length > 90 ? '…' : ''));
      line.appendChild(roleEl);
      line.appendChild(txt);
      preview.appendChild(line);
    }
    var actions = document.createElement('div');
    actions.className = 'hist-card-actions';
    var openBtn = document.createElement('button');
    openBtn.className = 'hist-open-btn';
    openBtn.textContent = 'Abrir conversa →';
    (function(sid) { openBtn.onclick = function() { loadSession(sid); }; })(s.id);
    actions.appendChild(openBtn);
    card.appendChild(top);
    card.appendChild(preview);
    card.appendChild(actions);
    grid.appendChild(card);
  }
  list.appendChild(grid);
}

function chatSessionTitle(hist) {
  for (var i = 0; i < hist.length; i++) {
    if (hist[i].role === 'user') {
      var c = hist[i].content;
      return c.slice(0, 40) + (c.length > 40 ? '…' : '');
    }
  }
  return 'Conversa';
}

function saveCurrentSession() {
  if (!S.chatHist.length || !S.currentSessionId) return;
  var idx = -1;
  for (var i = 0; i < S.chatSessions.length; i++) {
    if (S.chatSessions[i].id === S.currentSessionId) { idx = i; break; }
  }
  var sess = { id: S.currentSessionId, title: chatSessionTitle(S.chatHist), hist: S.chatHist.slice(), ts: Date.now() };
  if (idx >= 0) S.chatSessions[idx] = sess;
  else S.chatSessions.unshift(sess);
  if (S.chatSessions.length > 30) S.chatSessions = S.chatSessions.slice(0, 30);
  saveLS();
}

function loadSession(id) {
  saveCurrentSession();
  var sess = null;
  for (var i = 0; i < S.chatSessions.length; i++) {
    if (S.chatSessions[i].id === id) { sess = S.chatSessions[i]; break; }
  }
  if (!sess) return;
  S.currentSessionId = id;
  S.chatHist = sess.hist.slice();
  document.getElementById('chat-msgs').innerHTML = '';
  var col = document.getElementById('chat-col');
  col.classList.remove('empty');
  col.classList.add('has-msgs');
  document.getElementById('chat-in').placeholder = 'Manda uma mensagem...';
  for (var i = 0; i < sess.hist.length; i++) {
    var m = sess.hist[i];
    if (m.role === 'user') addMsgRaw('u', m.content);
    else addMsgRaw('a', m.content, m.tema, m.nivel);
  }
  go('chat', document.getElementById('n-chat'));
}

function deleteSession(id) {
  var newSessions = [];
  for (var i = 0; i < S.chatSessions.length; i++) {
    if (S.chatSessions[i].id !== id) newSessions.push(S.chatSessions[i]);
  }
  S.chatSessions = newSessions;
  if (S.currentSessionId === id) resetChatUI();
  var searchEl = document.getElementById('hist-search');
  renderHistorico(searchEl ? searchEl.value : '');
  saveLS();
  showToast('Conversa apagada.');
}

function clearAllChats() {
  S.chatSessions = [];
  S.currentSessionId = null;
  S.chatHist = [];
  resetChatUI();
  renderHistorico('');
  saveLS();
  showToast('Histórico limpo!');
}

function resetChatUI() {
  document.getElementById('chat-msgs').innerHTML = '';
  var col = document.getElementById('chat-col');
  col.classList.remove('has-msgs');
  col.classList.add('empty');
  document.getElementById('chat-in').placeholder = 'Como posso ajudar você hoje?';
  var g = document.getElementById('chat-greeting');
  if (g) { g.style.opacity = '1'; g.style.transform = 'none'; }
  S.currentSessionId = null;
  S.chatHist = [];
}

function newChat() {
  saveCurrentSession();
  resetChatUI();
  S.currentSessionId = 'sess_' + Date.now();
  go('chat', document.getElementById('n-chat'));
  showToast('Nova conversa!');
}

async function sendChat() {
  var inp = document.getElementById('chat-in');
  var btn = document.getElementById('btn-send');
  var msg = inp.value.trim();
  var img = chatImage;
  if (!msg && !img) return;
  inp.value = '';
  inp.style.height = 'auto';
  btn.disabled = true;
  if (!S.currentSessionId) S.currentSessionId = 'sess_' + Date.now();
  addMsg('u', msg || '[Imagem anexada]', null, null, img);
  S.chatHist.push({ role: 'user', content: msg || '[Imagem anexada]', imageName: img ? img.name : null });
  clearChatImage();
  var tid = addTyping();
  try {
    var raw = await callAI(buildChatPrompt(msg || 'Analise a imagem enviada.', !!img), img);
    delTyping(tid);
    var d;
    try { d = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch(e) { d = { resposta: raw, tema: null, nivel: null }; }
    S.chatHist.push({ role: 'assistant', content: d.resposta, tema: d.tema, nivel: d.nivel });
    addMsg('a', d.resposta, d.tema, d.nivel);
    saveCurrentSession();
    achChatHook();
  } catch(e) {
    delTyping(tid);
    addMsg('a', '❌ ' + e.message);
  }
  btn.disabled = false;
  inp.focus();
}

function buildChatPrompt(q, hasImage) {
  var c = S.aiConfig;
  var tomMap = {
    formal:    'Use linguagem formal, técnica e precisa.',
    didatico:  'Use linguagem clara, didática e com exemplos quando útil.',
    amigavel:  'Use linguagem amigável, descontraída e acessível.',
    socratico: 'Use o método socrático: faça perguntas para guiar o aluno ao entendimento.'
  };
  var hist = '';
  var imageRule = hasImage
    ? 'A mensagem inclui uma imagem anexada. Analise a imagem diretamente e responda sobre o que aparece nela. Se o texto for curto como "e essa?", entenda como "descreva/analise esta imagem". Nao invente detalhes que nao sejam visiveis.\n'
    : '';
  var slice = S.chatHist.slice(-8);
  for (var i = 0; i < slice.length; i++) {
    hist += (slice[i].role === 'user' ? 'Aluno' : c.nome) + ': ' + slice[i].content + '\n';
  }
  return 'Você é ' + c.nome + ', um assistente educacional honesto e preciso.\n' +
    'Idioma de resposta: ' + c.idioma + '.\n' +
    (tomMap[c.tom] || tomMap.didatico) + '\n' +
    imageRule +
    (c.extra ? 'Instrução extra: ' + c.extra + '\n' : '') +
    'REGRAS: Se não tiver CERTEZA diga que não sabe. Responda APENAS perguntas educacionais. Máximo 3 parágrafos.\n' +
    'Histórico:\n' + hist +
    'Pergunta: ' + q + '\n' +
    'Responda SOMENTE em JSON: {"resposta":"...","tema":"tema ou null","nivel":"basico|intermediario|avancado ou null"}';
}

function addMsg(role, text, tema, nivel, image) {
  var col = document.getElementById('chat-col');
  if (col.classList.contains('empty')) {
    var g = document.getElementById('chat-greeting');
    if (g) {
      g.style.transition = 'opacity .3s ease, transform .3s ease';
      g.style.opacity = '0';
      g.style.transform = 'translateY(-8px)';
    }
    setTimeout(function() {
      col.classList.remove('empty');
      col.classList.add('has-msgs');
    }, 280);
    document.getElementById('chat-in').placeholder = 'Manda uma mensagem...';
  }
  setTimeout(function() { addMsgRaw(role, text, tema, nivel, image); }, col.classList.contains('empty') ? 250 : 0);
}

function addMsgRaw(role, text, tema, nivel, image) {
  var c = document.getElementById('chat-msgs');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  var nm = { basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };
  var nlvl = nivel === 'basico' ? 'b' : nivel === 'intermediario' ? 'i' : 'a';
  var meta = (tema || nivel) ? '<div class="msg-meta">' +
    (tema  ? '<span class="bx bx-tema">📌 ' + tema + '</span>' : '') +
    (nivel ? '<span class="bx bx-' + nlvl + '">' + (nm[nivel] || nivel) + '</span>' : '') +
    '</div>' : '';
  d.innerHTML = role === 'u'
    ? '<div class="msg-bub-u">' + text + '</div>'
    : '<div class="msg-bub-a">' + text + meta + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function addTyping() {
  var c = document.getElementById('chat-msgs');
  var id = 'ty' + Date.now();
  var d = document.createElement('div');
  d.className = 'msg a';
  d.id = id;
  d.innerHTML = '<div class="msg-bub-a"><div class="typing"><span></span><span></span><span></span></div></div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  return id;
}
function delTyping(id) { var e = document.getElementById(id); if (e) e.remove(); }

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



function renderCal() {
  var y = S.calY, m = S.calM;
  document.getElementById('cal-ti').textContent = MOS[m] + ' ' + y;
  var first = new Date(y, m, 1).getDay(), dim = new Date(y, m+1, 0).getDate();
  var tds = today.toISOString().split('T')[0];
  var h = '';
  for (var d = 0; d < DYS.length; d++) h += '<div class="cal-dn">' + DYS[d][0] + '</div>';
  for (var i = 0; i < first; i++) h += '<div class="cal-d emp"></div>';
  for (var d = 1; d <= dim; d++) {
    var ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var isT = ds === tds, isS = ds === S.selDate;
    var evts = S.events[ds] || [], hasE = evts.length > 0;
    var evColor = hasE ? evts[0].color : '';
    var cls = 'cal-d';
    if (isT && !isS) cls += ' tdy';
    if (isS) cls += ' sel';
    if (hasE) cls += ' hev';
    h += '<div class="' + cls + '"' + (hasE ? ' style="--ev-color:' + evColor + '"' : '') + ' onclick="selDate(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('cal-g').innerHTML = h;
  renderEvts();
  var evDt = document.getElementById('ev-dt');
  if (evDt && !evDt.value) evDt.value = S.selDate;
  syncAgendaPickLabels();
}

function chMon(d) {
  S.calM += d;
  if (S.calM < 0)  { S.calM = 11; S.calY--; }
  if (S.calM > 11) { S.calM = 0;  S.calY++; }
  renderCal();
}

function selDate(d) { S.selDate = d; document.getElementById('ev-dt').value = d; renderCal(); }

function renderEvts() {
  var evts = S.events[S.selDate] || [];
  var tds = today.toISOString().split('T')[0];
  var dd = new Date(S.selDate + 'T12:00:00');
  document.getElementById('evts-hd').textContent = S.selDate === tds ? 'Eventos de hoje' : dd.getDate() + ' de ' + MOS[dd.getMonth()];
  if (evts.length) {
    var h = '';
    for (var i = 0; i < evts.length; i++) {
      var e = evts[i];
      h += '<div class="evt-item"><div class="evt-dot" style="background:' + e.color + '"></div><div class="evt-inf"><div class="evt-ti">' + e.title + '</div><div class="evt-tm">' + (e.time || 'Dia todo') + '</div></div><button class="evt-del" onclick="delEvt(\'' + S.selDate + '\',' + i + ')">✕</button></div>';
    }
    document.getElementById('evts-list').innerHTML = h;
  } else {
    document.getElementById('evts-list').innerHTML = '<div style="font-size:11px;color:var(--tx2);padding:7px 0">Nenhum evento neste dia.</div>';
  }
}

function addEvt() {
  var ti = document.getElementById('ev-ti').value.trim();
  var dt = document.getElementById('ev-dt').value;
  var tm = document.getElementById('ev-tm').value;
  if (!ti || !dt) { showToast('Preencha título e data!', 'err'); return; }
  if (!S.events[dt]) S.events[dt] = [];
  S.events[dt].push({ title: ti, time: tm, color: S.selColor });
  document.getElementById('ev-ti').value = '';
  document.getElementById('ev-tm').value = '';
  syncAgendaPickLabels();
  S.selDate = dt; renderCal(); saveLS(); showToast('📅 Evento adicionado!');
  checkAchievements();
}

function delEvt(dt, i) { S.events[dt].splice(i, 1); renderCal(); saveLS(); showToast('Evento removido.'); }
function selColor(el) {
  document.querySelectorAll('.col-o').forEach(function(o) { o.classList.remove('sel'); });
  el.classList.add('sel'); S.selColor = el.dataset.c;
}

var agPickY = today.getFullYear();
var agPickM = today.getMonth();
function fmtAgendaDateLabel(ds) {
  if (!ds) return 'Escolher data';
  var p = ds.split('-');
  return p[2] + ' ' + MOS3[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function syncAgendaPickLabels() {
  var dt = document.getElementById('ev-dt');
  var tm = document.getElementById('ev-tm');
  var dl = document.getElementById('ev-dt-label');
  var tl = document.getElementById('ev-tm-label');
  if (dl && dt) dl.textContent = fmtAgendaDateLabel(dt.value);
  if (tl && tm) tl.textContent = tm.value || 'Horário';
}
function closeAgendaPickers() {
  var dp = document.getElementById('ag-date-pop');
  var tp = document.getElementById('ag-time-pop');
  if (dp) dp.classList.remove('open');
  if (tp) tp.classList.remove('open');
}
function toggleAgendaDatePick() {
  var pop = document.getElementById('ag-date-pop');
  if (!pop) return;
  if (pop.classList.contains('open')) { closeAgendaPickers(); return; }
  closeAgendaPickers();
  var ds = document.getElementById('ev-dt').value || S.selDate || today.toISOString().split('T')[0];
  var d = new Date(ds + 'T12:00:00');
  agPickY = d.getFullYear();
  agPickM = d.getMonth();
  renderAgendaDatePick();
  pop.classList.add('open');
}
function renderAgendaDatePick() {
  var title = document.getElementById('ag-date-title');
  var grid = document.getElementById('ag-date-grid');
  if (!title || !grid) return;
  title.textContent = MOS[agPickM] + ' ' + agPickY;
  var first = new Date(agPickY, agPickM, 1).getDay(), dim = new Date(agPickY, agPickM + 1, 0).getDate();
  var selected = document.getElementById('ev-dt').value;
  var tds = today.toISOString().split('T')[0];
  var h = '';
  for (var d = 0; d < DYS.length; d++) h += '<div class="agp-dn">' + DYS[d][0] + '</div>';
  for (var i = 0; i < first; i++) h += '<button class="agp-d emp" type="button" tabindex="-1"></button>';
  for (var day = 1; day <= dim; day++) {
    var ds = agPickY + '-' + String(agPickM + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    var cls = 'agp-d';
    if (ds === tds && ds !== selected) cls += ' tdy';
    if (ds === selected) cls += ' sel';
    h += '<button class="' + cls + '" type="button" onclick="pickAgendaDate(\'' + ds + '\')">' + day + '</button>';
  }
  grid.innerHTML = h;
}
function agDateChMon(d) {
  agPickM += d;
  if (agPickM < 0) { agPickM = 11; agPickY--; }
  if (agPickM > 11) { agPickM = 0; agPickY++; }
  renderAgendaDatePick();
}
function pickAgendaDate(ds) {
  document.getElementById('ev-dt').value = ds;
  S.selDate = ds;
  closeAgendaPickers();
  renderCal();
}
function agDateToday() {
  pickAgendaDate(today.toISOString().split('T')[0]);
}
function toggleAgendaTimePick() {
  var pop = document.getElementById('ag-time-pop');
  if (!pop) return;
  if (pop.classList.contains('open')) { closeAgendaPickers(); return; }
  closeAgendaPickers();
  renderAgendaTimePick();
  pop.classList.add('open');
}
function renderAgendaTimePick() {
  var pop = document.getElementById('ag-time-pop');
  if (!pop) return;
  var selected = document.getElementById('ev-tm').value;
  var h = '<button class="agt-opt' + (!selected ? ' sel' : '') + '" type="button" onclick="pickAgendaTime(\'\')">Dia todo</button>';
  for (var hour = 6; hour <= 23; hour++) {
    for (var min = 0; min < 60; min += 30) {
      var tm = String(hour).padStart(2,'0') + ':' + String(min).padStart(2,'0');
      h += '<button class="agt-opt' + (tm === selected ? ' sel' : '') + '" type="button" onclick="pickAgendaTime(\'' + tm + '\')">' + tm + '</button>';
    }
  }
  pop.innerHTML = h;
}
function pickAgendaTime(tm) {
  document.getElementById('ev-tm').value = tm;
  syncAgendaPickLabels();
  closeAgendaPickers();
}

function initPins() {
  var wrap = document.getElementById('col-opts');
  PIN_COLORS.forEach(function(c, i) {
    var el = document.createElement('div');
    el.className = 'col-o' + (i === 0 ? ' sel' : '');
    el.style.background = c; el.dataset.c = c;
    el.onclick = function() { selColor(el); };
    wrap.appendChild(el);
  });
}

function toggleDatePick() {
  var pop = document.getElementById('date-pick-pop');
  if (pop.classList.contains('open')) { closeDatePick(); return; }
  renderDP();
  pop.classList.add('open');
  positionDatePick();
}
function closeDatePick() {
  var pop = document.getElementById('date-pick-pop');
  if (pop) pop.classList.remove('open');
}
function positionDatePick() {
  var wrap = document.getElementById('date-pick-wrap');
  var pop = document.getElementById('date-pick-pop');
  if (!wrap || !pop || !pop.classList.contains('open')) return;
  var r = wrap.getBoundingClientRect();
  var gap = 8;
  var w = pop.offsetWidth || 248;
  var h = pop.offsetHeight || 270;
  var left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
  var top = r.bottom + gap;
  if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - gap);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function renderDP() {
  var y = S.dpY, m = S.dpM;
  document.getElementById('dp-title').textContent = MOS[m] + ' ' + y;
  var first = new Date(y, m, 1).getDay(), dim = new Date(y, m+1, 0).getDate();
  var tds = today.toISOString().split('T')[0];
  var h = '';
  for (var d = 0; d < DYS.length; d++) h += '<div class="dp-dn">' + DYS[d][0] + '</div>';
  for (var i = 0; i < first; i++) h += '<div class="dp-d emp"></div>';
  for (var d = 1; d <= dim; d++) {
    var ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var cls = 'dp-d';
    if (ds === tds && ds !== S.dpSel) cls += ' tdy';
    if (ds === S.dpSel) cls += ' sel';
    h += '<div class="' + cls + '" onclick="dpPick(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('dp-grid').innerHTML = h;
}

function dpChMon(dir) {
  S.dpM += dir;
  if (S.dpM < 0)  { S.dpM = 11; S.dpY--; }
  if (S.dpM > 11) { S.dpM = 0;  S.dpY++; }
  renderDP();
}

function dpPick(ds) {
  S.dpSel = ds;
  var parts = ds.split('-');
  document.getElementById('date-pick-label').textContent = parts[2] + ' ' + MOS3[parseInt(parts[1]) - 1];
  closeDatePick();
}
function dpClear() { S.dpSel = ''; document.getElementById('date-pick-label').textContent = 'Sem data'; closeDatePick(); }
function dpToday() { dpPick(today.toISOString().split('T')[0]); }

document.addEventListener('click', function(e) {
  var w = document.getElementById('date-pick-wrap');
  if (w && !w.contains(e.target)) closeDatePick();
  var ag = document.querySelector('.agenda-pick-row');
  if (ag && !ag.contains(e.target)) closeAgendaPickers();
  if (!e.target.closest || !e.target.closest('.tk-select-wrap')) closeTaskSelects();
  if (!e.target.closest || !e.target.closest('.cfg-select-wrap')) closeCfgSelects();
});

function migrateTask(t) {
  if (!t.status) t.status = t.done ? 'done' : 'todo';
  if (!t.cat) t.cat = 'geral';
  return t;
}

function addTask() {
  var tx = document.getElementById('tk-in').value.trim();
  if (!tx) { showToast('Digite a tarefa!', 'err'); return; }
  S.tasks.unshift({ id: Date.now(), text: tx, prio: document.getElementById('tk-pr').value, cat: document.getElementById('tk-cat').value, date: S.dpSel, status: 'todo', done: false });
  document.getElementById('tk-in').value = '';
  updBadge(); renderTasks(); saveLS(); showToast('☑ Tarefa adicionada!');
  checkAchievements();
}

function moveTask(id, newStatus) {
  for (var i = 0; i < S.tasks.length; i++) {
    if (S.tasks[i].id === id) { S.tasks[i].status = newStatus; S.tasks[i].done = newStatus === 'done'; break; }
  }
  updBadge(); renderTasks(); saveLS();
  checkAchievements();
}

function delTask(id) {
  var newT = [];
  for (var i = 0; i < S.tasks.length; i++) { if (S.tasks[i].id !== id) newT.push(S.tasks[i]); }
  S.tasks = newT;
  updBadge(); renderTasks(); saveLS(); showToast('Tarefa removida.');
}

function updBadge() {
  var n = 0;
  for (var i = 0; i < S.tasks.length; i++) { if (S.tasks[i].status !== 'done') n++; }
  var bd = document.getElementById('tk-badge');
  if (n > 0) { bd.textContent = n; bd.style.display = ''; }
  else bd.style.display = 'none';
}

function closeTaskSelects(except) {
  document.querySelectorAll('.tk-select-wrap').forEach(function(w) {
    if (!except || w !== except) w.classList.remove('open');
  });
}
function syncTaskSelect(id) {
  var sel = document.getElementById(id);
  var lbl = document.getElementById(id + '-label');
  var menu = document.getElementById(id + '-menu');
  if (!sel || !lbl || !menu) return;
  var selected = sel.options[sel.selectedIndex];
  lbl.textContent = selected ? selected.textContent : '';
  menu.querySelectorAll('button').forEach(function(btn) {
    btn.classList.toggle('sel', btn.dataset.value === sel.value);
  });
}
function initTaskSelect(id) {
  var sel = document.getElementById(id);
  var menu = document.getElementById(id + '-menu');
  if (!sel || !menu || menu.dataset.ready) return;
  var h = '';
  for (var i = 0; i < sel.options.length; i++) {
    var opt = sel.options[i];
    h += '<button type="button" data-value="' + opt.value + '" onclick="pickTaskSelect(\'' + id + '\',\'' + opt.value + '\')">' + opt.textContent + '</button>';
  }
  menu.innerHTML = h;
  menu.dataset.ready = '1';
  syncTaskSelect(id);
}
function initTaskSelects() {
  initTaskSelect('tk-pr');
  initTaskSelect('tk-cat');
}
function toggleTaskSelect(id) {
  var wrap = document.getElementById(id + '-btn');
  wrap = wrap ? wrap.closest('.tk-select-wrap') : null;
  if (!wrap) return;
  var willOpen = !wrap.classList.contains('open');
  closeTaskSelects(wrap);
  wrap.classList.toggle('open', willOpen);
}
function pickTaskSelect(id, value) {
  var sel = document.getElementById(id);
  if (!sel) return;
  sel.value = value;
  syncTaskSelect(id);
  closeTaskSelects();
}

function closeCfgSelects(except) {
  document.querySelectorAll('.cfg-select-wrap').forEach(function(w) {
    if (!except || w !== except) w.classList.remove('open');
  });
}
function syncCfgSelect(id) {
  var sel = document.getElementById(id);
  var lbl = document.getElementById(id + '-label');
  var menu = document.getElementById(id + '-menu');
  if (!sel || !lbl || !menu) return;
  var selected = sel.options[sel.selectedIndex];
  lbl.textContent = selected ? selected.textContent : '';
  menu.querySelectorAll('button').forEach(function(btn) {
    btn.classList.toggle('sel', btn.dataset.value === sel.value);
  });
}
function initCfgSelect(id) {
  var sel = document.getElementById(id);
  var menu = document.getElementById(id + '-menu');
  if (!sel || !menu || menu.dataset.ready) return;
  var h = '';
  for (var i = 0; i < sel.options.length; i++) {
    var opt = sel.options[i];
    h += '<button type="button" data-value="' + opt.value + '" onclick="pickCfgSelect(\'' + id + '\',\'' + opt.value + '\')">' + opt.textContent + '</button>';
  }
  menu.innerHTML = h;
  menu.dataset.ready = '1';
  syncCfgSelect(id);
}
function initCfgSelects() {
  initCfgSelect('mdl-sel');
  initCfgSelect('camb-lang');
  initCfgSelect('ai-idioma');
}
function toggleCfgSelect(id) {
  var wrap = document.getElementById(id + '-btn');
  wrap = wrap ? wrap.closest('.cfg-select-wrap') : null;
  if (!wrap) return;
  var willOpen = !wrap.classList.contains('open');
  closeCfgSelects(wrap);
  wrap.classList.toggle('open', willOpen);
}
function pickCfgSelect(id, value) {
  var sel = document.getElementById(id);
  if (!sel) return;
  sel.value = value;
  syncCfgSelect(id);
  closeCfgSelects();
  sel.dispatchEvent(new Event('change'));
}

var _dragId = null;
var _dragSource = null;
var _dragSize = null;
var _dragPlaceholder = null;
var _dragPreview = null;
function removeDragPreview() {
  if (_dragPreview && _dragPreview.parentNode) _dragPreview.parentNode.removeChild(_dragPreview);
  _dragPreview = null;
}
function createDragPreview(card) {
  removeDragPreview();
  var r = card.getBoundingClientRect();
  var preview = card.cloneNode(true);
  preview.classList.add('kb-card--drag-preview');
  preview.style.width = r.width + 'px';
  preview.style.height = r.height + 'px';
  preview.style.position = 'fixed';
  preview.style.left = '-9999px';
  preview.style.top = '-9999px';
  preview.style.pointerEvents = 'none';
  document.body.appendChild(preview);
  _dragPreview = preview;
  return preview;
}
function ensureDragPlaceholder() {
  if (!_dragPlaceholder) {
    _dragPlaceholder = document.createElement('div');
    _dragPlaceholder.className = 'kb-drag-placeholder';
    _dragPlaceholder.setAttribute('aria-hidden', 'true');
  }
  _dragPlaceholder.classList.remove('kb-drag-placeholder--out');
  return _dragPlaceholder;
}
function sizeDragPlaceholder(open) {
  if (!_dragPlaceholder || !_dragSize) return;
  _dragPlaceholder.style.height = Math.max(1, _dragSize.height) + 'px';
  _dragPlaceholder.style.width = Math.max(1, _dragSize.width) + 'px';
  if (open) _dragPlaceholder.classList.add('kb-drag-placeholder--visible');
}
function removeDragPlaceholder(animated) {
  if (!_dragPlaceholder || !_dragPlaceholder.parentNode) return;
  var ph = _dragPlaceholder;
  if (!animated) { ph.parentNode.removeChild(ph); return; }
  ph.style.height = '0px';
  ph.classList.remove('kb-drag-placeholder--visible');
  ph.classList.add('kb-drag-placeholder--out');
  setTimeout(function() {
    if (ph.parentNode) ph.parentNode.removeChild(ph);
    ph.classList.remove('kb-drag-placeholder--out');
  }, 190);
}
function placeDragPlaceholder(container, y) {
  if (!container || !_dragSource) return;
  var ph = ensureDragPlaceholder();
  var needsOpenAnimation = ph.parentNode !== container;
  if (needsOpenAnimation) {
    ph.classList.remove('kb-drag-placeholder--visible');
    ph.style.height = '0px';
  }
  document.querySelectorAll('.kb-cards').forEach(function(c) { c.classList.toggle('kb-cards--placeholder', c === container); });
  var cards = Array.prototype.filter.call(container.querySelectorAll('.kb-card'), function(card) {
    return card !== _dragSource;
  });
  var before = null;
  for (var i = 0; i < cards.length; i++) {
    var box = cards[i].getBoundingClientRect();
    if (y < box.top + box.height / 2) { before = cards[i]; break; }
  }
  if (before) container.insertBefore(ph, before);
  else container.appendChild(ph);
  if (needsOpenAnimation) {
    requestAnimationFrame(function() { sizeDragPlaceholder(true); });
  } else {
    sizeDragPlaceholder(true);
  }
}
function clearDragState() {
  document.body.classList.remove('kb-dragging');
  document.querySelectorAll('.kb-col').forEach(function(c) { c.classList.remove('kb-col--drop'); });
  document.querySelectorAll('.kb-cards').forEach(function(c) { c.classList.remove('kb-cards--placeholder'); });
  document.querySelectorAll('.kb-card').forEach(function(c) { c.classList.remove('kb-card--dragging'); });
  removeDragPlaceholder(true);
  removeDragPreview();
  if (_dragSource) _dragSource.style.display = '';
  _dragSource = null;
  _dragSize = null;
}
function setDragTarget(col) {
  document.querySelectorAll('.kb-col').forEach(function(c) { c.classList.toggle('kb-col--drop', c === col); });
}
function dragStart(e, id) {
  _dragId = id;
  _dragSource = e.currentTarget;
  _dragSize = _dragSource.getBoundingClientRect();
  document.body.classList.add('kb-dragging');
  _dragSource.classList.add('kb-card--dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    var r = _dragSource.getBoundingClientRect();
    var preview = createDragPreview(_dragSource);
    e.dataTransfer.setDragImage(preview, e.clientX - r.left, e.clientY - r.top);
  }
  setTimeout(function() {
    if (_dragSource) _dragSource.style.display = 'none';
  }, 0);
}
function dragEnd() { _dragId = null; clearDragState(); }
function dropTask(e, status) {
  e.preventDefault();
  if (_dragId == null) return;
  moveTask(_dragId, status);
  _dragId = null;
  clearDragState();
}
document.addEventListener('dragover', function(e) {
  if (_dragId == null) return;
  var col = e.target.closest ? e.target.closest('.kb-col') : null;
  if (!col) return;
  e.preventDefault();
  setDragTarget(col);
  placeDragPlaceholder(col.querySelector('.kb-cards'), e.clientY);
});
document.addEventListener('dragleave', function(e) {
  if (_dragId == null) return;
  var board = document.querySelector('.kb-board');
  if (board && !board.contains(e.relatedTarget)) {
    setDragTarget(null);
    removeDragPlaceholder(true);
  }
});
window.addEventListener('resize', positionDatePick);
window.addEventListener('scroll', positionDatePick, true);

function renderTasks() {
  S.tasks = S.tasks.map(migrateTask);
  var cols = { todo: [], doing: [], done: [] };
  var prMap = { alta: { label:'Alta' }, media: { label:'Média' }, baixa: { label:'Baixa' } };
  var catIco = { geral:'📁', estudo:'📚', projeto:'🛠', pessoal:'👤', urgente:'⚡' };
  var prDot = { alta:'#f87171', media:'#fbbf24', baixa:'#4ade80' };
  var nextSt = { todo:'doing', doing:'done', done:'todo' };
  var nextLbl = { todo:'▶ Iniciar', doing:'✓ Concluir', done:'↺ Reabrir' };
  for (var i = 0; i < S.tasks.length; i++) {
    var t = S.tasks[i];
    if (cols[t.status]) cols[t.status].push(t);
  }
  ['todo','doing','done'].forEach(function(s) {
    var el = document.getElementById('kb-cnt-' + s);
    if (el) el.textContent = cols[s].length;
  });
  var total = S.tasks.length, done = cols.done.length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;
  var fill = document.getElementById('kb-progress-fill');
  var lbl = document.getElementById('kb-progress-label');
  var wrap = document.getElementById('kb-progress-wrap');
  if (fill) fill.style.width = pct + '%';
  if (lbl) lbl.textContent = total > 0 ? done + ' de ' + total + ' concluídas (' + pct + '%)' : 'Nenhuma tarefa ainda';
  if (wrap) wrap.style.display = total > 0 ? 'flex' : 'none';
  ['todo','doing','done'].forEach(function(status) {
    var container = document.getElementById('kb-cards-' + status);
    if (!container) return;
    if (!cols[status].length) { container.innerHTML = '<div class="kb-empty">Nenhuma tarefa</div>'; return; }
    var h = '';
    for (var i = 0; i < cols[status].length; i++) {
      var t = cols[status][i];
      var pr = prMap[t.prio] || prMap.media;
      var ico = catIco[t.cat] || '📁';
      var dot = prDot[t.prio] || prDot.media;
      var venc = t.date ? verificaVencimento(t.date) : null;
      h += '<div class="kb-card kb-card--' + t.prio + '" draggable="true" ondragstart="dragStart(event,' + t.id + ')" ondragend="dragEnd()" ondragover="event.preventDefault()" ondrop="event.stopPropagation();dropTask(event,\'' + status + '\')">' +
        '<div class="kb-card-stripe" style="background:' + dot + '"></div>' +
        '<div class="kb-card-body">' +
        '<div class="kb-card-text">' + t.text + '</div>' +
        '<div class="kb-card-tags">' +
        '<span class="kb-tag kb-tag--cat">' + ico + ' ' + t.cat + '</span>' +
        '<span class="kb-tag kb-tag--' + t.prio + '">' + pr.label + '</span>' +
        (t.date ? '<span class="kb-tag kb-tag--date' + (venc==='vencida'?' kb-tag--venc':venc==='hoje'?' kb-tag--hoje':'') + '">' + fmtD(t.date) + (venc==='vencida'?' ⚠':venc==='hoje'?' 📅':'') + '</span>' : '') +
        '</div>' +
        '<div class="kb-card-actions">' +
        '<button class="kb-btn-move" onclick="moveTask(' + t.id + ',\'' + nextSt[status] + '\')">' + nextLbl[status] + '</button>' +
        '<button class="kb-btn-del" onclick="delTask(' + t.id + ')">✕</button>' +
        '</div></div></div>';
    }
    container.innerHTML = h;
  });
}

function verificaVencimento(dateStr) {
  var d = new Date(dateStr + 'T00:00:00'), hoje = new Date();
  hoje.setHours(0,0,0,0);
  var diff = d - hoje;
  if (diff < 0) return 'vencida';
  if (diff < 86400000) return 'hoje';
  return 'futura';
}

function fmtD(d) {
  if (!d) return '';
  var parts = d.split('-');
  return parts[2] + ' ' + MOS3[parseInt(parts[1]) - 1];
}

function renderProg() {
  var p = S.prog;
  var taxa = p.total > 0 ? Math.round((p.acertos / p.total) * 100) : null;
  document.getElementById('st-tot').textContent = p.total;
  document.getElementById('st-ac').textContent  = taxa !== null ? taxa + '%' : '—';
  document.getElementById('st-fc').textContent  = S.fc.length;

  renderPizza(p.acertos, p.erros);

  // Barras por tema
  var temas = [];
  for (var k in p.temas) {
    var t = p.temas[k];
    if (t.acertos + t.erros > 0) temas.push([k, t]);
  }
  temas.sort(function(a,b){
    var pa = (a[1].acertos)/(a[1].acertos+a[1].erros);
    var pb = (b[1].acertos)/(b[1].acertos+b[1].erros);
    return pb - pa;
  });

  var barH = '';
  for (var i = 0; i < temas.length; i++) {
    var nome = temas[i][0], v = temas[i][1];
    var tot = v.acertos + v.erros;
    var pct = Math.round((v.acertos / tot) * 100);
    var cor = pct >= 70 ? 'var(--gn)' : pct >= 40 ? 'var(--yw)' : 'var(--rd)';
    barH += '<div class="prog-bar-row">' +
      '<div class="prog-bar-top">' +
      '<span class="prog-bar-tema">' + nome + '</span>' +
      '<span class="prog-bar-pct" style="color:' + cor + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="prog-bar-track"><div class="prog-bar-fill" style="width:' + pct + '%;background:' + cor + '"></div></div>' +
      '</div>';
  }
  document.getElementById('bar-ch').innerHTML = barH ||
    '<div class="prog-empty">Complete flashcards<br>para ver aqui.</div>';

  // Recomendações
  var dif = temas.filter(function(x) {
    var tot = x[1].acertos + x[1].erros;
    return tot >= 2 && (x[1].erros / tot) > 0.4;
  }).sort(function(a,b){
    var ea = a[1].erros/(a[1].acertos+a[1].erros);
    var eb = b[1].erros/(b[1].acertos+b[1].erros);
    return eb - ea;
  }).slice(0, 4);

  var recH = '';
  for (var i = 0; i < dif.length; i++) {
    var nome = dif[i][0], v = dif[i][1];
    var tot = v.acertos + v.erros;
    var errPct = Math.round((v.erros / tot) * 100);
    recH += '<div class="prog-rec-item">' +
      '<div class="prog-rec-icon">📌</div>' +
      '<div class="prog-rec-info">' +
      '<div class="prog-rec-tema">' + nome + '</div>' +
      '<div class="prog-rec-sub">' + errPct + '% de erros · ' + tot + ' tentativas</div>' +
      '</div>' +
      '<button class="prog-rec-btn" onclick="goFC(\'' + nome + '\')">Praticar →</button>' +
      '</div>';
  }
  document.getElementById('rec-list').innerHTML = recH ||
    '<div class="prog-empty">Aparece após praticar flashcards.</div>';
}

/* ── renderPizza — usa o novo donut menor (cx/cy=55, r=36) ── */
function renderPizza(acertos, erros) {
  var svg = document.getElementById('pizza-svg');
  var leg = document.getElementById('pizza-legend');
  var total = acertos + erros;

  if (total === 0) {
    svg.innerHTML = '<circle cx="55" cy="55" r="36" fill="none" stroke="rgba(128,128,128,0.12)" stroke-width="14"/>' +
      '<text x="55" y="59" text-anchor="middle" font-size="9" fill="rgba(128,128,128,0.35)" font-family="Inter,sans-serif">Sem dados</text>';
    leg.innerHTML = '<div class="prog-empty">Pratique flashcards<br>para ver aqui</div>';
    return;
  }

  var cx=55, cy=55, r=36, sw=14;
  var slices = [
    { val:acertos, color:'var(--gn)', label:'Acertos' },
    { val:erros,   color:'var(--rd)', label:'Erros'   }
  ].filter(function(s){ return s.val > 0; });

  var ang = -Math.PI/2, paths = '';
  for (var i = 0; i < slices.length; i++) {
    var s = slices[i], a = (s.val/total)*2*Math.PI, end = ang+a;
    var x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang);
    var x2=cx+r*Math.cos(end), y2=cy+r*Math.sin(end);
    if (slices.length === 1) {
      paths += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'" opacity=".85"/>';
    } else {
      paths += '<path d="M '+x1+' '+y1+' A '+r+' '+r+' 0 '+(a>Math.PI?1:0)+' 1 '+x2+' '+y2+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'" opacity=".85"/>';
    }
    ang = end;
  }

  var pct = Math.round((acertos/total)*100);
  svg.innerHTML =
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(128,128,128,0.10)" stroke-width="'+sw+'"/>'+
    paths+
    '<text x="'+cx+'" y="'+(cy-5)+'" text-anchor="middle" font-size="16" font-weight="600" fill="var(--tx)" font-family="Inter,sans-serif">'+pct+'%</text>'+
    '<text x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle" font-size="8" fill="var(--tx2)" font-family="Inter,sans-serif">acerto</text>';

  var legH = '';
  for (var i = 0; i < slices.length; i++) {
    legH += '<div class="prog-leg-row">' +
      '<div class="prog-leg-dot" style="background:'+slices[i].color+'"></div>' +
      '<span class="prog-leg-label">'+slices[i].label+'</span>' +
      '<span class="prog-leg-val">'+slices[i].val+'</span>' +
      '</div>';
  }
  leg.innerHTML = legH;
}

function goFC(t) {
  document.getElementById('fc-tema').value = t;
  go('flashcards', document.getElementById('n-flashcards'));
}

function saveKey() {
  S.apiKey = document.getElementById('api-key').value.trim();
  S.model  = document.getElementById('mdl-sel').value;
  saveLS();
  showToast('🔑 Chave salva!');
}

function saveName() {
  var n = document.getElementById('usr-nm').value.trim() || 'Usuário';
  document.getElementById('sb-un').textContent = n;
  document.getElementById('sb-av').textContent = n[0].toUpperCase();
  var g = document.getElementById('chat-greeting');
  if (g) { var h = new Date().getHours(); g.textContent = (h<12?'Bom dia':h<18?'Boa tarde':'Boa noite') + ', ' + n + '!'; }
  localStorage.setItem('fl_username', n);
  showToast('Nome atualizado!');
}

function saveAIConfig() {
  S.aiConfig.nome   = document.getElementById('ai-nome').value.trim() || 'NucleaAI';
  S.aiConfig.idioma = document.getElementById('ai-idioma').value;
  S.aiConfig.extra  = document.getElementById('ai-extra').value.trim();
  saveLS(); updIABadge(); showToast('🤖 Personalidade salva!');
}

function saveFCConfig() {
  S.fcConfig.qtd        = parseInt(document.getElementById('fc-qtd-range').value) || 5;
  S.fcConfig.tipoDireto = document.getElementById('fc-tipo-direto').checked;
  S.fcConfig.tipoMC     = document.getElementById('fc-tipo-mc').checked;
  syncFCInlineQtd(S.fcConfig.qtd);
  syncFCInlineDif(S.fcConfig.dif);
  saveLS(); showToast('🃏 Configurações salvas!');
}

function saveELKey() {
  S.elConfig.key     = document.getElementById('el-key').value.trim();
  S.elConfig.voiceId = document.getElementById('el-voice').value.trim();
  var langEl = document.getElementById('camb-lang');
  S.elConfig.lang    = langEl ? parseInt(langEl.value) || 2 : 2;
  saveLS(); updateEngineBadge(); showToast('🎙 Configuração de voz salva!');
}

function setMotorPill(v, btn) {
  document.querySelectorAll('#s-voz .cfg-pill').forEach(function(p) { p.classList.remove('on'); });
  btn.classList.add('on');
  S.elConfig.motor = v;
  document.getElementById('badge-voz').textContent = v === 'cambai' ? 'camb.ai' : 'Navegador';
  saveLS(); updateEngineBadge();
}

function setPillTom(btn) {
  document.querySelectorAll('#s-ia .cfg-pill').forEach(function(p) { p.classList.remove('on'); });
  btn.classList.add('on');
  S.aiConfig.tom = btn.dataset.v;
  updIABadge();
}

function setPillDif(btn) {
  document.querySelectorAll('#s-fc .cfg-pill').forEach(function(p) { p.classList.remove('on'); });
  btn.classList.add('on');
  S.fcConfig.dif = btn.dataset.v;
  syncFCInlineDif(btn.dataset.v);
  updFCBadge();
}

function updIABadge() {
  var tomLabels = { formal:'Formal', didatico:'Didático', amigavel:'Amigável', socratico:'Socrático' };
  var idioma = document.getElementById('ai-idioma');
  document.getElementById('badge-ia').textContent =
    (tomLabels[S.aiConfig.tom] || 'Didático') + ' · ' + (idioma ? idioma.value : 'pt-BR');
}

function updFCBadge() {
  var qtd = document.getElementById('fc-qtd-range').value;
  var difLabels = { basico:'Básico', intermediario:'Médio', avancado:'Avançado', misto:'Misto' };
  document.getElementById('badge-fc').textContent = qtd + ' cartões · ' + (difLabels[S.fcConfig.dif] || 'Básico');
}

function applyAIConfig() {
  var c = S.aiConfig;
  var el;
  el = document.getElementById('ai-nome');   if (el) el.value = c.nome;
  el = document.getElementById('ai-idioma'); if (el) el.value = c.idioma;
  el = document.getElementById('ai-extra');  if (el) el.value = c.extra;
  document.querySelectorAll('#s-ia .cfg-pill').forEach(function(b) {
    b.classList.toggle('on', b.dataset.v === c.tom);
  });
  syncCfgSelect('ai-idioma');
  updIABadge();
}

function applyFCConfig() {
  var c = S.fcConfig;
  var r = document.getElementById('fc-qtd-range'), v = document.getElementById('fc-qtd-val');
  if (r) r.value = c.qtd;
  if (v) v.textContent = c.qtd;
  var d = document.getElementById('fc-tipo-direto'); if (d) d.checked = c.tipoDireto;
  var m = document.getElementById('fc-tipo-mc');     if (m) m.checked = c.tipoMC;
  var inlineQtd = document.getElementById('fc-qtd-inline');
  if (inlineQtd) inlineQtd.textContent = c.qtd;
  document.querySelectorAll('.fc-dif-pill').forEach(function(b) {
    b.classList.toggle('active', b.dataset.v === c.dif);
  });
  document.querySelectorAll('#s-fc .cfg-pill').forEach(function(b) {
    b.classList.toggle('on', b.dataset.v === c.dif);
  });
  updFCBadge();
}

function applyELConfig() {
  var c = S.elConfig;
  var k = document.getElementById('el-key');   if (k) k.value = c.key;
  var v = document.getElementById('el-voice'); if (v) v.value = c.voiceId;
  var l = document.getElementById('camb-lang'); if (l) l.value = String(c.lang || 2);
  document.querySelectorAll('#s-voz .cfg-pill').forEach(function(b) {
    var isMotor = (b.id === 'pill-browser' && c.motor === 'browser') || (b.id === 'pill-cambai' && c.motor === 'cambai');
    b.classList.toggle('on', isMotor);
  });
  syncCfgSelect('camb-lang');
  document.getElementById('badge-voz').textContent = c.motor === 'cambai' ? 'camb.ai' : 'Navegador';
  updateEngineBadge();
}

function applyAvatarVideo(estado) {
  var isLight = document.body.classList.contains('light');
  
  var idleId   = isLight ? 'av-idle-lt'    : 'av-idle';
  var falandoId = isLight ? 'av-falando-lt' : 'av-falando';
  
  var show = (estado === 'falando') ? falandoId : idleId;
  
  var ids = ['av-idle', 'av-falando', 'av-idle-lt', 'av-falando-lt'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === show) {
      el.style.display = 'block';
      el.play().catch(function(){});
    } else {
      el.style.display = 'none';
      el.pause();
    }
  });
}

function updateEngineBadge() {
  var badge = document.getElementById('voz-engine-badge');
  if (!badge) return;
  if (S.elConfig.motor === 'cambai' && S.elConfig.key) {
    badge.textContent = '✨ camb.ai'; badge.className = 'voz-engine-badge el';
  } else {
    badge.textContent = '🔊 Navegador'; badge.className = 'voz-engine-badge';
  }
}

async function callAI(prompt, image) {
  var key = S.apiKey || (document.getElementById('api-key') && document.getElementById('api-key').value.trim());
  var model = S.model || 'open-mixtral-8x7b';
  if (!key) throw new Error('Configure sua chave Mistral em ⚙ Configurações');
  var content = image
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: image.dataUrl }]
    : prompt;
  var res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, max_tokens: 1000, messages: [{ role: 'user', content: content }] })
  });
  if (!res.ok) {
    var e = await res.json().catch(function() { return {}; });
    throw new Error('Mistral ' + res.status + ': ' + (e.message || 'Verifique sua chave'));
  }
  return (await res.json()).choices[0].message.content;
}

async function falarCambAI(texto) {
  var key     = S.elConfig.key;
  var voiceId = parseInt(S.elConfig.voiceId) || 147320;
  var lang    = S.elConfig.lang || 2;
  var headers = { 'Content-Type': 'application/json', 'x-api-key': key };
  var createRes = await fetch('https://client.camb.ai/apis/tts', {
    method: 'POST', headers: headers,
    body: JSON.stringify({ text: texto, voice_id: voiceId, language: lang })
  });
  if (!createRes.ok) {
    var errBody = {}; try { errBody = await createRes.json(); } catch(e) {}
    throw new Error('camb.ai ' + createRes.status + ': ' + (errBody.message || errBody.detail || 'Verifique sua chave'));
  }
  var createData = await createRes.json();
  var taskId = createData.task_id;
  if (!taskId) throw new Error('camb.ai: task_id não retornado');
  var runId = null;
  for (var t = 0; t < 60; t++) {
    await new Promise(function(r) { setTimeout(r, 2000); });
    var statusRes = await fetch('https://client.camb.ai/apis/tts/' + taskId, { method: 'GET', headers: headers });
    if (!statusRes.ok) throw new Error('camb.ai: falha ao verificar status (' + statusRes.status + ')');
    var statusData = await statusRes.json();
    if (statusData.status === 'SUCCESS') { runId = statusData.run_id; break; }
    else if (statusData.status === 'FAILED') throw new Error('camb.ai: geração de áudio falhou');
  }
  if (!runId) throw new Error('camb.ai: timeout aguardando geração de áudio');
  var audioRes = await fetch('https://client.camb.ai/apis/tts-result/' + runId, { method: 'GET', headers: { 'x-api-key': key } });
  if (!audioRes.ok) throw new Error('camb.ai: falha ao baixar áudio (' + audioRes.status + ')');
  var audioBlob = await audioRes.blob();
  var audioUrl  = URL.createObjectURL(audioBlob);
  var audio     = new Audio();
  return new Promise(function(resolve, reject) {
    audio.oncanplaythrough = function() { VOZ.falando = true; vozUI('falando', 'Respondendo...'); };
    audio.onended = function() { VOZ.falando = false; URL.revokeObjectURL(audioUrl); vozUI('idle', 'Pressione o microfone para falar'); resolve(); };
    audio.onerror = function() { VOZ.falando = false; URL.revokeObjectURL(audioUrl); reject(new Error('Falha ao reproduzir áudio do camb.ai')); };
    audio.src = audioUrl; audio.load(); audio.play().catch(reject);
  });
}

var VOZ = { rec: null, synth: window.speechSynthesis, ouvindo: false, falando: false, pensando: false };

function vozInit() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { vozUI('erro','Seu navegador não suporta voz. Use Chrome ou Edge.'); return false; }
  VOZ.rec = new SR();
  VOZ.rec.lang = 'pt-BR'; VOZ.rec.continuous = false; VOZ.rec.interimResults = true;
  VOZ.rec.onstart  = function() { VOZ.ouvindo = true; vozUI('ouvindo','Ouvindo...'); };
  VOZ.rec.onresult = function(e) {
    var interim = '', final = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final += t) : (interim += t);
    }
    var txt = final || interim;
    document.getElementById('voz-transcript').textContent = txt ? '"' + txt + '"' : '';
    if (final && final.trim()) { VOZ.ouvindo = false; vozResponder(final.trim()); }
  };
  VOZ.rec.onnomatch = function() { vozUI('idle','Não entendi. Tente novamente.'); };
  VOZ.rec.onerror   = function(e) {
    VOZ.ouvindo = false;
    var msgs = { 'no-speech':'Nenhuma fala detectada.', 'not-allowed':'Permissão negada.', 'network':'Erro de rede.' };
    vozUI('idle', msgs[e.error] || 'Erro: ' + e.error);
  };
  VOZ.rec.onend = function() { VOZ.ouvindo = false; if (!VOZ.falando && !VOZ.pensando) vozUI('idle','Pressione o microfone para falar'); };
  return true;
}

function vozToggle() {
  if (VOZ.falando) { VOZ.synth.cancel(); VOZ.falando = false; VOZ.pensando = false; vozUI('idle','Pressione o microfone para falar'); return; }
  if (VOZ.ouvindo) { try { VOZ.rec.stop(); } catch(e) {} VOZ.ouvindo = false; vozUI('idle','Pressione o microfone para falar'); return; }
  if (!VOZ.rec && !vozInit()) return;
  document.getElementById('voz-transcript').textContent = '';
  document.getElementById('voz-response').textContent = '';
  try { VOZ.rec.start(); } catch(e) { VOZ.rec = null; if (vozInit()) try { VOZ.rec.start(); } catch(e2) {} }
}

async function vozResponder(texto) {
  VOZ.pensando = true; vozUI('pensando','Pensando...');
  var c = S.aiConfig;
  var tomMap = { formal:'Use linguagem formal e técnica.', didatico:'Use linguagem clara e didática.', amigavel:'Use linguagem amigável e descontraída.', socratico:'Guie o aluno com uma pergunta de volta.' };
  var idiomaInstr = c.idioma==='en' ? 'Answer in English only.' : c.idioma==='es' ? 'Responde SOLO en español.' : 'Responda SOMENTE em português do Brasil.';
  var prompt = 'Você é ' + c.nome + ', um assistente educacional por voz.\nResponda em 1 ou 2 frases curtas. ' + idiomaInstr + '\n' + (tomMap[c.tom]||tomMap.didatico) + '\n' + (c.extra?'Instrução extra: '+c.extra+'\n':'') + 'IMPORTANTE: Nunca use markdown. Só texto simples.\nPergunta: ' + texto;
  try {
    var resposta = await callAI(prompt);
    var limpo = resposta.replace(/```[\s\S]*?```/g,'').replace(/\{[\s\S]*?\}/g,'').replace(/[*_#`\[\]]/g,'').replace(/"resposta"\s*:\s*"([^"]+)"/i,'$1').trim();
    if (!limpo) limpo = resposta.replace(/[*_#`]/g,'').trim();
    var final = limpo || 'Desculpe, não consegui processar.';
    document.getElementById('voz-response').textContent = final;
    VOZ.pensando = false;
    achVozHook();
    await vozFalar(final);
  } catch(e) { VOZ.pensando = false; vozUI('idle','Erro: '+e.message); showToast(e.message,'err'); }
}

async function vozFalar(texto) {
  if (S.elConfig.motor === 'cambai' && S.elConfig.key) {
    try { await falarCambAI(texto); return; }
    catch(e) { showToast('camb.ai falhou, usando voz do navegador: ' + e.message, 'err'); }
  }
  VOZ.synth.cancel();
  var u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR'; u.rate = 1.0; u.pitch = 1.1;
  var vozes = VOZ.synth.getVoices();
  var voz = null;
  for (var i = 0; i < vozes.length; i++) { if (vozes[i].lang === 'pt-BR') { voz = vozes[i]; break; } }
  if (!voz) for (var i = 0; i < vozes.length; i++) { if (vozes[i].lang.startsWith('pt')) { voz = vozes[i]; break; } }
  if (voz) u.voice = voz;
  u.onstart = function() { VOZ.falando = true; vozUI('falando','Respondendo...'); };
  var onFim = function() { VOZ.falando = false; vozUI('idle','Pressione o microfone para falar'); };
  u.onend = onFim; u.onerror = onFim;
  setTimeout(function() { VOZ.synth.speak(u); }, 80);
}

function vozUI(estado, statusTxt) {
  var status = document.getElementById('voz-status');
  var waves  = document.getElementById('voz-waves');
  var avatar = document.getElementById('voz-avatar');
  var btn    = document.getElementById('voz-mic-btn');
  var lbl    = document.getElementById('voz-mic-label');
  if (status) status.textContent = statusTxt || '';
  ['ouvindo','pensando','falando'].forEach(function(s) {
    if (waves)  waves.classList.remove('voz-waves--'+s);
    if (avatar) avatar.classList.remove('voz-av--'+s);
    if (btn)    btn.classList.remove('voz-btn--'+s);
  });
  if (estado !== 'idle' && estado !== 'erro') {
    if (waves)  waves.classList.add('voz-waves--'+estado);
    if (avatar) avatar.classList.add('voz-av--'+estado);
    if (btn)    btn.classList.add('voz-btn--'+estado);
  }
  applyAvatarVideo(estado === 'idle' || estado === 'erro' ? 'idle' : estado);
  var cfg = { idle:{label:'Falar'}, ouvindo:{label:'Parar'}, pensando:{label:'Aguarde'}, falando:{label:'Parar'}, erro:{label:'Falar'} };
  var cf = cfg[estado] || cfg.idle;
  if (lbl) lbl.textContent = cf.label;
}

function vozStop() {
  if (VOZ.ouvindo) { try { VOZ.rec && VOZ.rec.stop(); } catch(e) {} VOZ.ouvindo = false; }
  if (VOZ.falando) { VOZ.synth.cancel(); VOZ.falando = false; }
  VOZ.pensando = false;
}

function toggleTheme() {
  var isLight = document.body.classList.toggle('light');
  localStorage.setItem('fl_theme', isLight ? 'light' : 'dark');
  var sw = document.getElementById('theme-sw'), lbl = document.getElementById('theme-label');
  if (sw) sw.classList.toggle('on', isLight);
  if (lbl) lbl.textContent = isLight ? 'Claro' : 'Escuro';
  applyAvatarVideo('idle'); // atualiza o vídeo ao trocar tema
  document.getElementById('badge-ap').textContent = isLight ? 'Claro' : 'Escuro';
}

function togAcc(id) {
  var items = document.querySelectorAll('.acc-item');
  var el = document.getElementById(id);
  var isOpen = el.classList.contains('open');
  items.forEach(function(i) { i.classList.remove('open'); });
  if (!isOpen) el.classList.add('open');
}

var ACH_DEFS = [
  { id:'chat_1', cat:'chat', icon:'💬', bg:'rgba(108,142,245,.15)', stripe:'#6c8ef5', name:'Primeira Pergunta', desc:'Envie sua primeira mensagem para a IA.', xp:30, raro:'comum', check: function(s){ return s.chatSessions.reduce(function(n,ss){ return n+ss.hist.filter(function(m){return m.role==='user';}).length; },0) >= 1; } },
  { id:'chat_10', cat:'chat', icon:'🔥', bg:'rgba(108,142,245,.15)', stripe:'#6c8ef5', name:'Curioso de Plantão', desc:'Faça 10 perguntas à IA.', xp:80, raro:'comum', prog: function(s){ return { cur: s.chatSessions.reduce(function(n,ss){ return n+ss.hist.filter(function(m){return m.role==='user';}).length; },0), max:10 }; }, check: function(s){ return s.chatSessions.reduce(function(n,ss){ return n+ss.hist.filter(function(m){return m.role==='user';}).length; },0) >= 10; } },
  { id:'chat_50', cat:'chat', icon:'🧠', bg:'rgba(108,142,245,.15)', stripe:'#6c8ef5', name:'Mente Inquieta', desc:'Faça 50 perguntas à IA no total.', xp:200, raro:'raro', prog: function(s){ return { cur: s.chatSessions.reduce(function(n,ss){ return n+ss.hist.filter(function(m){return m.role==='user';}).length; },0), max:50 }; }, check: function(s){ return s.chatSessions.reduce(function(n,ss){ return n+ss.hist.filter(function(m){return m.role==='user';}).length; },0) >= 50; } },
  { id:'chat_noite', cat:'chat', icon:'🌙', bg:'rgba(108,142,245,.15)', stripe:'#6c8ef5', name:'Estudante Noturno', desc:'Use o chat depois das 22h.', xp:60, raro:'comum', check: function(){ return new Date().getHours() >= 22 || !!localStorage.getItem('ach_chat_noite'); } },
  { id:'fc_1', cat:'flashcard', icon:'📚', bg:'rgba(109,40,217,.12)', stripe:'#a78bfa', name:'Primeiro Deck', desc:'Responda seu primeiro flashcard.', xp:50, raro:'comum', check: function(s){ return s.prog.total >= 1; } },
  { id:'fc_deck5', cat:'flashcard', icon:'⚡', bg:'rgba(109,40,217,.12)', stripe:'#a78bfa', name:'Gerador Veloz', desc:'Estude flashcards de 5 temas diferentes.', xp:100, raro:'comum', prog: function(s){ return { cur: Object.keys(s.prog.temas).length, max:5 }; }, check: function(s){ return Object.keys(s.prog.temas).length >= 5; } },
  { id:'fc_100', cat:'flashcard', icon:'🎖', bg:'rgba(109,40,217,.12)', stripe:'#a78bfa', name:'Centena de Cartas', desc:'Responda 100 flashcards no total.', xp:200, raro:'raro', prog: function(s){ return { cur:s.prog.total, max:100 }; }, check: function(s){ return s.prog.total >= 100; } },
  { id:'fc_70pct', cat:'flashcard', icon:'🎯', bg:'rgba(109,40,217,.12)', stripe:'#a78bfa', name:'Mira Certeira', desc:'Tenha 70% ou mais de taxa de acerto geral.', xp:150, raro:'raro', check: function(s){ return s.prog.total >= 10 && (s.prog.acertos/s.prog.total) >= .7; } },
  { id:'fc_500', cat:'flashcard', icon:'🌟', bg:'rgba(109,40,217,.12)', stripe:'#a78bfa', name:'Lenda dos Flashcards', desc:'Complete 500 flashcards.', xp:500, raro:'lenda', prog: function(s){ return { cur:s.prog.total, max:500 }; }, check: function(s){ return s.prog.total >= 500; } },
  { id:'tk_1', cat:'tarefa', icon:'☑', bg:'rgba(74,222,128,.12)', stripe:'#4ade80', name:'Missão Cumprida', desc:'Conclua sua primeira tarefa.', xp:40, raro:'comum', check: function(s){ return s.tasks.some(function(t){ return t.status==='done'; }); } },
  { id:'tk_10', cat:'tarefa', icon:'📋', bg:'rgba(74,222,128,.12)', stripe:'#4ade80', name:'Produtivo', desc:'Conclua 10 tarefas no total.', xp:100, raro:'comum', prog: function(s){ return { cur:s.tasks.filter(function(t){return t.status==='done';}).length, max:10 }; }, check: function(s){ return s.tasks.filter(function(t){return t.status==='done';}).length >= 10; } },
  { id:'tk_urgente', cat:'tarefa', icon:'⚡', bg:'rgba(74,222,128,.12)', stripe:'#4ade80', name:'Sem Procrastinação', desc:'Conclua uma tarefa marcada como urgente.', xp:80, raro:'comum', check: function(s){ return s.tasks.some(function(t){ return t.status==='done' && t.cat==='urgente'; }); } },
  { id:'ag_1', cat:'agenda', icon:'📅', bg:'rgba(251,191,36,.12)', stripe:'#fbbf24', name:'Planejador', desc:'Adicione seu primeiro evento na agenda.', xp:40, raro:'comum', check: function(s){ return Object.values(s.events).some(function(arr){ return arr.length>0; }); } },
  { id:'ag_10', cat:'agenda', icon:'🗓', bg:'rgba(251,191,36,.12)', stripe:'#fbbf24', name:'Agenda Cheia', desc:'Adicione 10 eventos na agenda.', xp:100, raro:'raro', prog: function(s){ return { cur:Object.values(s.events).reduce(function(n,a){return n+a.length;},0), max:10 }; }, check: function(s){ return Object.values(s.events).reduce(function(n,a){return n+a.length;},0) >= 10; } },
  { id:'voz_1', cat:'voz', icon:'🎙', bg:'rgba(248,113,113,.12)', stripe:'#f87171', name:'Primeira Voz', desc:'Use o assistente de voz pela primeira vez.', xp:50, raro:'comum', check: function(){ return !!localStorage.getItem('ach_voz_1'); } },
  { id:'voz_10', cat:'voz', icon:'🔊', bg:'rgba(248,113,113,.12)', stripe:'#f87171', name:'Orador', desc:'Faça 10 interações por voz.', xp:120, raro:'raro', prog: function(){ return { cur:parseInt(localStorage.getItem('ach_voz_count')||'0'), max:10 }; }, check: function(){ return parseInt(localStorage.getItem('ach_voz_count')||'0') >= 10; } }
];

var ACH_LEVELS = [
  {lvl:1,nome:'Iniciante',min:0},{lvl:2,nome:'Aprendiz',min:100},{lvl:3,nome:'Estudante',min:250},
  {lvl:4,nome:'Dedicado',min:450},{lvl:5,nome:'Focado',min:700},{lvl:6,nome:'Analista',min:1000},
  {lvl:7,nome:'Pesquisador',min:1400},{lvl:8,nome:'Mestre',min:2000},{lvl:9,nome:'Especialista',min:2800},{lvl:10,nome:'Sábio',min:3800}
];

var ACH_STATE = { filter:'todos', unlocked: null };
try { ACH_STATE.unlocked = new Set(JSON.parse(localStorage.getItem('fl_ach_unlocked') || '[]')); } catch(e) { ACH_STATE.unlocked = new Set(); }

function achXP() { return ACH_DEFS.filter(function(a){ return ACH_STATE.unlocked.has(a.id); }).reduce(function(s,a){ return s+a.xp; },0); }
function achLevel(xp) { for (var i = ACH_LEVELS.length-1; i >= 0; i--) { if (xp >= ACH_LEVELS[i].min) return ACH_LEVELS[i]; } return ACH_LEVELS[0]; }

function checkAchievements() {
  var hasNew = false;
  for (var i = 0; i < ACH_DEFS.length; i++) {
    var a = ACH_DEFS[i];
    if (ACH_STATE.unlocked.has(a.id)) continue;
    try { if (a.check(S)) { ACH_STATE.unlocked.add(a.id); hasNew = true; showAchToast(a); } } catch(e) {}
  }
  if (hasNew) {
    localStorage.setItem('fl_ach_unlocked', JSON.stringify(Array.from(ACH_STATE.unlocked)));
    var badge = document.getElementById('ach-badge');
    if (badge) badge.style.display = '';
  }
}

function renderConquistas() {
  checkAchievements();
  var xp = achXP(), lvl = achLevel(xp);
  var next = null;
  for (var i = 0; i < ACH_LEVELS.length; i++) { if (ACH_LEVELS[i].lvl === lvl.lvl + 1) { next = ACH_LEVELS[i]; break; } }
  var pct = next ? Math.round((xp - lvl.min) / (next.min - lvl.min) * 100) : 100;
  document.getElementById('ach-lvl-num').textContent    = lvl.lvl;
  document.getElementById('ach-hero-title').textContent = lvl.nome;
  document.getElementById('ach-hero-sub').textContent   = next ? 'Próximo: ' + next.nome : 'Nível máximo!';
  document.getElementById('ach-xp-label').textContent   = next ? xp + ' / ' + next.min + ' XP' : xp + ' XP';
  document.getElementById('ach-stat-unlocked').textContent = ACH_STATE.unlocked.size;
  document.getElementById('ach-stat-total').textContent    = ACH_DEFS.length;
  document.getElementById('ach-stat-xp').textContent       = xp;
  var circ = 2 * Math.PI * 34;
  var arc = document.getElementById('ach-ring-arc');
  if (arc) setTimeout(function() { arc.style.strokeDashoffset = circ * (1 - pct/100); }, 100);
  var fill = document.getElementById('ach-xp-fill');
  if (fill) setTimeout(function() { fill.style.width = pct + '%'; }, 120);
  renderAchList();
}

function achFilter(f, btn) {
  ACH_STATE.filter = f;
  document.querySelectorAll('.ach-filt').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  renderAchList();
}

function renderAchList() {
  var f = ACH_STATE.filter;
  var list = f==='todos' ? ACH_DEFS : f==='desbloqueado' ? ACH_DEFS.filter(function(a){return ACH_STATE.unlocked.has(a.id);}) : ACH_DEFS.filter(function(a){return a.cat===f;});
  var done=[], inprog=[], locked=[];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (ACH_STATE.unlocked.has(a.id)) { done.push(a); continue; }
    if (a.prog) { try { if (a.prog(S).cur > 0) { inprog.push(a); continue; } } catch(e) {} }
    locked.push(a);
  }
  var html = '';
  if (done.length)   html += '<div class="ach-section-title">Desbloqueadas (' + done.length + ')</div><div class="ach-grid">' + done.map(achCard).join('') + '</div>';
  if (inprog.length) html += '<div class="ach-section-title">Em progresso (' + inprog.length + ')</div><div class="ach-grid">' + inprog.map(achCard).join('') + '</div>';
  if (locked.length) html += '<div class="ach-section-title">Bloqueadas (' + locked.length + ')</div><div class="ach-grid">' + locked.map(achCard).join('') + '</div>';
  if (!html) html = '<div style="font-size:13px;color:var(--tx2);padding:12px 0">Nenhuma conquista nesta categoria ainda.</div>';
  document.getElementById('ach-list').innerHTML = html;
}

function achCard(a) {
  var isDone = ACH_STATE.unlocked.has(a.id);
  var progHtml = '';
  if (!isDone && a.prog) {
    try {
      var p = a.prog(S), pct = Math.min(100, Math.round(p.cur/p.max*100));
      progHtml = '<div class="ach-prog-wrap"><div class="ach-prog-track"><div class="ach-prog-fill" style="width:' + pct + '%"></div></div><div class="ach-prog-label">' + p.cur + ' / ' + p.max + '</div></div>';
    } catch(e) {}
  }
  var rareText = a.raro==='lenda' ? 'Lendária' : a.raro==='raro' ? 'Rara' : 'Comum';
  var statusIcon = isDone
    ? '<div class="ach-status-icon done"><svg viewBox="0 0 10 10"><polyline points="1.5,5 4,8 8.5,2"/></svg></div>'
    : '<div class="ach-status-icon lock"><svg viewBox="0 0 10 10"><rect x="2" y="4.5" width="6" height="5" rx="1"/><path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke-linecap="round"/></svg></div>';
  return '<div class="ach-card' + (isDone?'':' ach-locked') + '"><div class="ach-card-stripe" style="background:' + a.stripe + '"></div><div class="ach-icon-box" style="background:' + a.bg + '">' + a.icon + '</div><div class="ach-body"><div class="ach-name-row"><span class="ach-name">' + a.name + '</span><span class="ach-rare ach-rare-' + a.raro + '">' + rareText + '</span></div><div class="ach-desc">' + a.desc + '</div>' + progHtml + '<div class="ach-footer"><span class="ach-xp-pill">+' + a.xp + ' XP</span>' + statusIcon + '</div></div></div>';
}

var _achToastTimer = null;
function showAchToast(a) {
  var el = document.getElementById('ach-toast-el');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ach-toast-el'; el.className = 'ach-toast';
    el.innerHTML = '<div class="ach-toast-icon" id="ach-ti"></div><div><div class="ach-toast-title">🏆 Conquista desbloqueada!</div><div class="ach-toast-name" id="ach-tn"></div><div class="ach-toast-xp" id="ach-tx"></div></div>';
    document.body.appendChild(el);
  }
  document.getElementById('ach-ti').textContent = a.icon;
  document.getElementById('ach-tn').textContent = a.name;
  document.getElementById('ach-tx').textContent = '+' + a.xp + ' XP';
  el.classList.add('show');
  clearTimeout(_achToastTimer);
  _achToastTimer = setTimeout(function() { el.classList.remove('show'); }, 4000);
}

function achVozHook() {
  var n = parseInt(localStorage.getItem('ach_voz_count') || '0') + 1;
  localStorage.setItem('ach_voz_count', String(n));
  if (n === 1) localStorage.setItem('ach_voz_1', '1');
  checkAchievements();
}

function achChatHook() {
  if (new Date().getHours() >= 22) localStorage.setItem('ach_chat_noite', '1');
  checkAchievements();
}

(function boot() {
  loadLS();
  initPins();
  renderCal();
  initTaskSelects();
  initCfgSelects();
  renderTasks();
  applyAIConfig();
  applyFCConfig();
  applyELConfig();
  checkAchievements();
  applyAvatarVideo('idle');

  var apiKeyEl = document.getElementById('api-key');
  var mdlSelEl = document.getElementById('mdl-sel');
  if (S.apiKey && apiKeyEl) apiKeyEl.value = S.apiKey;
  if (S.model && mdlSelEl) mdlSelEl.value = S.model;
  syncCfgSelect('mdl-sel');

  var h = new Date().getHours();
  var saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var nm = localStorage.getItem('fl_username') || 'Usuário';
  document.getElementById('sb-un').textContent = nm;
  document.getElementById('sb-av').textContent = nm[0].toUpperCase();
  var usrNm = document.getElementById('usr-nm'); if (usrNm) usrNm.value = nm;
  var g = document.getElementById('chat-greeting'); if (g) g.textContent = saud + ', ' + nm + '!';

  if (localStorage.getItem('fl_theme') === 'light') {
    document.body.classList.add('light');
    var sw = document.getElementById('theme-sw'), lbl = document.getElementById('theme-label');
    if (sw) sw.classList.add('on');
    if (lbl) lbl.textContent = 'Claro';
    applyAvatarVideo('idle');
  }

  var badge = document.getElementById('badge-ap');
  if (badge) badge.textContent = document.body.classList.contains('light') ? 'Claro' : 'Escuro';
})();

document.getElementById('usr-nm').addEventListener('change', function() {
  localStorage.setItem('fl_username', this.value.trim());
});

// ═══════════════════════════════════════════════════════════════════
// PATCHES NucleaAI — Substituir os trechos correspondentes no index.html
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PATCHES NucleaAI — Substituir os trechos correspondentes no index.html
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// PATCH 1: toggleSb — não aplica .col no mobile (impede sumiço do ☰)
// ──────────────────────────────────────────────────────────────────
function toggleSb() {
  if (window.innerWidth <= 640) return; // ignora em mobile
  document.getElementById('sb').classList.toggle('col');
}

// ──────────────────────────────────────────────────────────────────
// PATCH 2: openMobSb / closeMobSb — gerenciam apenas mob-open
// ──────────────────────────────────────────────────────────────────
function openMobSb() {
  document.getElementById('sb').classList.add('mob-open');
  document.getElementById('sb-overlay').classList.add('mob-open');
}
function closeMobSb() {
  document.getElementById('sb').classList.remove('mob-open');
  document.getElementById('sb-overlay').classList.remove('mob-open');
}

// ──────────────────────────────────────────────────────────────────
// PATCH 3: addMsgRaw — botões apenas com ícones, fora do bubble
// ──────────────────────────────────────────────────────────────────
function addMsgRaw(role, text, tema, nivel, image) {
  var c = document.getElementById('chat-msgs');
  var d = document.createElement('div');
  d.className = 'msg ' + role;

  var nm = { basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };
  var nlvl = nivel === 'basico' ? 'b' : nivel === 'intermediario' ? 'i' : 'a';
  var meta = (tema || nivel) ? '<div class="msg-meta">' +
    (tema  ? '<span class="bx bx-tema">📌 ' + tema + '</span>' : '') +
    (nivel ? '<span class="bx bx-' + nlvl + '">' + (nm[nivel] || nivel) + '</span>' : '') +
    '</div>' : '';

  if (role === 'u') {
    var imgHtml = image ? '<img class="msg-user-img" src="' + image.dataUrl + '" alt="' + (image.name || 'Imagem enviada') + '">' : '';
    var textHtml = text ? '<div class="msg-user-text">' + text + '</div>' : '';
    d.innerHTML = '<div class="msg-bub-u' + (image ? ' has-img' : '') + '">' + imgHtml + textHtml + '</div>';
  } else {
    d.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:flex-start;max-width:100%">' +
        '<div class="msg-bub-a">' +
          '<div class="msg-text-content">' + text + '</div>' +
          meta +
        '</div>' +
        '<div class="msg-actions">' +
  '<button class="msg-action-btn" onclick="copyMsg(this)" title="Copiar">' +
    '<img src="icons/copiar-alt.png" class="ic16" alt="Copiar" ' +
    'onerror="this.replaceWith(document.createTextNode(\'📋\'))"/>' +
  '</button>' +
  '<button class="msg-action-btn" onclick="reloadMsg(this)" title="Regenerar">' +
    '<img src="icons/vire-a-direita.png" class="ic16" alt="Regenerar" ' +
    'onerror="this.replaceWith(document.createTextNode(\'🔄\'))"/>' +
  '</button>' +
      '</div>';
      
  }

  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// ──────────────────────────────────────────────────────────────────
// PATCH 4: copyMsg — acessa o bubble irmão acima dos botões
// ──────────────────────────────────────────────────────────────────
function copyMsg(btn) {
  var actionsDiv = btn.closest('.msg-actions');
  var wrapper = actionsDiv ? actionsDiv.parentElement : null;
  var bub = wrapper ? wrapper.querySelector('.msg-bub-a') : null;
  var textEl = bub ? bub.querySelector('.msg-text-content') : null;
  var text = textEl ? textEl.textContent : '';

  navigator.clipboard.writeText(text).then(function() {
    var orig = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:13px;line-height:1;color:var(--gn)">✓</span>';
    btn.classList.add('copied');
    setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }).catch(function() {
    showToast('Não foi possível copiar.', 'err');
  });
}

// ──────────────────────────────────────────────────────────────────
// PATCH 5: reloadMsg — corrigido para nova estrutura do DOM
// ──────────────────────────────────────────────────────────────────
async function reloadMsg(btn) {
  var lastUser = null;
  for (var i = S.chatHist.length - 1; i >= 0; i--) {
    if (S.chatHist[i].role === 'user') { lastUser = S.chatHist[i].content; break; }
  }
  if (!lastUser) { showToast('Nenhuma pergunta para recarregar.', 'err'); return; }

  // Remove última resposta do histórico
  for (var i = S.chatHist.length - 1; i >= 0; i--) {
    if (S.chatHist[i].role === 'assistant') { S.chatHist.splice(i, 1); break; }
  }

  btn.disabled = true;
  btn.innerHTML = '<span style="font-size:11px;opacity:.5">...</span>';

  // Remove a .msg.a inteira do DOM
  var msgDiv = btn.closest('.msg.a');
  if (msgDiv) msgDiv.remove();

  var tid = addTyping();
  try {
    var raw = await callAI(buildChatPrompt(lastUser));
    delTyping(tid);
    var d;
    try { d = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch(e) { d = { resposta: raw, tema: null, nivel: null }; }
    S.chatHist.push({ role: 'assistant', content: d.resposta, tema: d.tema, nivel: d.nivel });
    addMsg('a', d.resposta, d.tema, d.nivel);
    saveCurrentSession();
  } catch(e) {
    delTyping(tid);
    addMsg('a', '❌ ' + e.message);
  }
}

function pickChatImage(e) {
  var file = e.target.files[0];
  if (!file) return;

  if(!file.type.startsWith('image/')) {
    showToast('Por favor, selecione um arquivo de imagem.', 'err');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(event) {
    chatImage = {
      name: file.name,
      type: file.type,
      dataUrl: reader.result
    };
    var preview = document.getElementById('chat-img-preview');
    if (preview) {
      preview.innerHTML =
        '<img src="' + reader.result + '" alt="Imagem anexada" />' +
        '<span>' + file.name + '</span>' +
        '<button type="button" onclick="clearChatImage()" title="Remover imagem">×</button>';
      preview.classList.add('on');
    }
    showToast('Imagem anexada!');
  }
  reader.readAsDataURL(file);
}

function clearChatImage() {
  chatImage = null;
  var input = document.getElementById('chat-img-input');
  var preview = document.getElementById('chat-img-preview');
  if (input) input.value = '';
  if (preview) {
    preview.innerHTML = '';
    preview.classList.remove('on');
  }
}

(function() {
 
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCHnPz_bb92UoMBTcjegIGQ_GgY6FluRBk",
  authDomain: "nucleaai-30555.firebaseapp.com",
  projectId: "nucleaai-30555",
  storageBucket: "nucleaai-30555.firebasestorage.app",
  messagingSenderId: "809997459519",
  appId: "1:809997459519:web:392698d2eccfe3380e988a",
  measurementId: "G-HCPBQXEJJ3"
};
 
var _uid       = null;
var _syncTimer = null;
var _patched   = false;
 

function loadScript(src, cb) {
  var s = document.createElement('script');
  s.src = src;
  s.onload = cb;
  s.onerror = function() { console.warn('[NucleaAI] Failed to load:', src); };
  document.head.appendChild(s);
}
 
async function init() {
  firebase.initializeApp(FIREBASE_CONFIG);
  await initAppCheck();
  var auth = firebase.auth();
  var db   = firebase.firestore();
 
  
  function userDoc(col, id) {
    return db.collection('users').doc(_uid).collection(col).doc(id);
  }
 
  function fsSet(col, id, data) {
    if (!_uid) return Promise.resolve();
    return userDoc(col, id).set(data, { merge: true }).catch(function(e) {
      console.warn('[NucleaAI] fsSet:', e);
    });
  }
 
  function fsGet(col, id) {
    if (!_uid) return Promise.resolve(null);
    return userDoc(col, id).get().then(function(snap) {
      return snap.exists ? snap.data() : null;
    }).catch(function() { return null; });
  }
 
  function cloudSave() {
    if (!_uid || typeof S === 'undefined') return;
    setSyncStatus('saving');
 
    var batch = db.batch();
 
    batch.set(userDoc('app','config'), {
      aiConfig:  S.aiConfig  || {},
      fcConfig:  S.fcConfig  || {},
      elConfig:  { motor: (S.elConfig||{}).motor, lang: (S.elConfig||{}).lang },
      username:  localStorage.getItem('fl_username') || 'Usuário',
      theme:     localStorage.getItem('fl_theme')    || 'dark',
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','progress'), {
      prog: S.prog || { total:0, acertos:0, erros:0, temas:{} },
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','tasks'), {
      tasks: S.tasks || [],
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','events'), {
      events: S.events || {},
      updatedAt: Date.now()
    }, { merge: true });
 
    var unlockedArr = [];
    try { unlockedArr = Array.from(ACH_STATE.unlocked); } catch(e) {}
    batch.set(userDoc('app','achievements'), {
      unlocked: unlockedArr,
      vozCount: parseInt(localStorage.getItem('ach_voz_count') || '0'),
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.commit().then(function() {
      // salva chats separado
      return fsSet('app','chats', {
        sessions:  (S.chatSessions || []).slice(0, 30),
        updatedAt: Date.now()
      });
    }).then(function() {
      setSyncStatus('synced');
    }).catch(function(e) {
      console.warn('[NucleaAI] cloudSave:', e);
      setSyncStatus('error');
    });
  }
 
  function debounceSave() {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(cloudSave, 1500);
  }
 
  function cloudLoad() {
    setSyncStatus('saving');
    Promise.all([
      fsGet('app','config'),
      fsGet('app','progress'),
      fsGet('app','tasks'),
      fsGet('app','events'),
      fsGet('app','achievements'),
      fsGet('app','chats'),
    ]).then(function(results) {
      var cfg   = results[0];
      var prog  = results[1];
      var tasks = results[2];
      var evts  = results[3];
      var achs  = results[4];
      var chats = results[5];
 
      if (cfg) {
        if (cfg.aiConfig) Object.assign(S.aiConfig, cfg.aiConfig);
        if (cfg.fcConfig) Object.assign(S.fcConfig, cfg.fcConfig);
        if (cfg.username) localStorage.setItem('fl_username', cfg.username);
        if (cfg.theme) {
          var isLight = cfg.theme === 'light';
          localStorage.setItem('fl_theme', cfg.theme);
          document.body.classList.toggle('light', isLight);
          var sw  = document.getElementById('theme-sw');
          var lbl = document.getElementById('theme-label');
          var bdg = document.getElementById('badge-ap');
          if (sw)  sw.classList.toggle('on', isLight);
          if (lbl) lbl.textContent = isLight ? 'Claro' : 'Escuro';
          if (bdg) bdg.textContent = isLight ? 'Claro' : 'Escuro';
        }
      }
      if (prog  && prog.prog)     S.prog          = prog.prog;
      if (tasks && tasks.tasks)   S.tasks         = tasks.tasks;
      if (evts  && evts.events)   S.events        = evts.events;
      if (chats && chats.sessions) S.chatSessions = chats.sessions;
      if (achs  && achs.unlocked) {
        try {
          ACH_STATE.unlocked = new Set(achs.unlocked);
          localStorage.setItem('fl_ach_unlocked', JSON.stringify(achs.unlocked));
        } catch(e) {}
        if (achs.vozCount) localStorage.setItem('ach_voz_count', String(achs.vozCount));
      }
 
      if (typeof applyAIConfig === 'function') applyAIConfig();
      if (typeof applyFCConfig === 'function') applyFCConfig();
      if (typeof applyELConfig === 'function') applyELConfig();
      if (typeof renderTasks   === 'function') renderTasks();
      if (typeof updBadge      === 'function') updBadge();
      if (typeof renderCal     === 'function') renderCal();
      if (typeof saveLS        === 'function') saveLS();
 
      setSyncStatus('synced');
      showToast('✅ Dados carregados da nuvem!');
    }).catch(function(e) {
      console.warn('[NucleaAI] cloudLoad:', e);
      setSyncStatus('error');
    });
  }
 
  
  function patchSaveLS() {
    if (_patched) return;
    _patched = true;
    var orig = window.saveLS;
    window.saveLS = function() {
      orig();
      if (_uid) debounceSave();
    };
  }
 
 
  function updateAuthUI(user) {
    var lo = document.getElementById('auth-logged-out');
    var li = document.getElementById('auth-logged-in');
    if (!lo || !li) return;
 
    if (user) {
      lo.style.display = 'none';
      li.style.display = 'block';
 
      var name  = user.displayName || user.email || 'Usuário';
      var first = name.split(' ')[0];
 
      var elName  = document.getElementById('sb-un');
      var elEmail = document.getElementById('sb-email');
      if (elName)  elName.textContent  = first;
      if (elEmail) { elEmail.textContent = user.email; elEmail.style.display = 'block'; }
 
      var avImg    = document.getElementById('sb-av-img');
      var avLetter = document.getElementById('sb-av-letter');
      if (user.photoURL && avImg) {
        avImg.src = user.photoURL;
        avImg.style.display = 'block';
        if (avLetter) avLetter.style.display = 'none';
      } else if (avLetter) {
        avLetter.textContent = (first[0] || 'U').toUpperCase();
        avLetter.style.display = 'flex';
        if (avImg) avImg.style.display = 'none';
      }
 
      var g = document.getElementById('chat-greeting');
      if (g) {
        var h = new Date().getHours();
        g.textContent = (h<12?'Bom dia':h<18?'Boa tarde':'Boa noite') + ', ' + first + '!';
      }
    } else {
      lo.style.display = 'block';
      li.style.display = 'none';
      setSyncStatus('offline');
    }
  }
 
  function setSyncStatus(status) {
    var dot = document.getElementById('auth-sync-dot');
    var lbl = document.getElementById('auth-sync-label');
    if (!dot || !lbl) return;
    var map = {
      synced:  { c:'#4ade80', t:'Sincronizado'   },
      saving:  { c:'#fbbf24', t:'Salvando...'    },
      offline: { c:'#666',    t:'Offline'         },
      error:   { c:'#f87171', t:'Erro ao salvar'  },
    };
    var s = map[status] || map.offline;
    dot.style.background = s.c;
    lbl.textContent      = s.t;
  }
  window._setSyncStatus = setSyncStatus;
 
  
  window.authLogin = function() {
    var btn = document.getElementById('btn-google-login');
    var lbl = btn ? btn.querySelector('.auth-btn-label') : null;
    if (btn) btn.disabled = true;
    if (lbl) lbl.textContent = 'Entrando...';
 
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
 
    auth.signInWithPopup(provider).catch(function(e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        showToast('Erro ao entrar: ' + e.message, 'err');
      }
      if (btn) btn.disabled = false;
      if (lbl) lbl.textContent = 'Entrar com Google';
    });
  };
 
window.authLogout = function() {
  if (!confirm('Sair da conta? Seus dados ficam salvos na nuvem.')) return;
  auth.signOut().then(function() {
    _uid = null;
    _patched = false;

    // Limpa todos os dados locais ao sair
    var keysToRemove = [
      'fl_chats','fl_tasks','fl_events','fl_prog',
      'fl_aiConfig','fl_fcConfig','fl_elConfig',
      'fl_ach_unlocked','fl_username','fl_theme',
      'ach_voz_count','ach_voz_1','ach_chat_noite'
    ];
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    // Reseta o estado em memória
    S.chatSessions = []; S.chatHist = []; S.currentSessionId = null;
    S.tasks = []; S.events = {}; S.prog = { total:0, acertos:0, erros:0, temas:{} };
    ACH_STATE.unlocked = new Set();

    // Reseta a UI
    if (typeof resetChatUI === 'function') resetChatUI();
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof renderCal   === 'function') renderCal();

    updateAuthUI(null);
    showToast('Até logo! 👋');
  });
};
 
  
  auth.onAuthStateChanged(function(user) {
    if (user) {
      _uid = user.uid;
 
      // Salva perfil
      userDoc('profile','info').set({
        uid:         user.uid,
        displayName: user.displayName,
        email:       user.email,
        photoURL:    user.photoURL,
        lastLogin:   Date.now()
      }, { merge: true }).catch(function(){});
 
      updateAuthUI(user);
 
      // Espera S estar pronto
      function tryLoad() {
        if (typeof S !== 'undefined' && typeof saveLS === 'function') {
          cloudLoad();
          patchSaveLS();
        } else {
          setTimeout(tryLoad, 100);
        }
      }
      tryLoad();
    } else {
      _uid = null;
      updateAuthUI(null);
    }
  });
 
}

function initAppCheck() {
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  var siteKey = (cfg.FIREBASE_APP_CHECK_SITE_KEY || '').trim();

  if (!siteKey) {
    console.info('[NucleaAI] App Check aguardando FIREBASE_APP_CHECK_SITE_KEY em config.js.');
    return Promise.resolve();
  }

  if (!firebase.appCheck) {
    console.warn('[NucleaAI] Firebase App Check SDK nao foi carregado.');
    return Promise.resolve();
  }

  try {
    firebase.appCheck().activate(siteKey, true);
    console.info('[NucleaAI] Firebase App Check ativado.');
    if (cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN) {
      console.info('[NucleaAI] App Check debug ligado. Se o token ainda nao apareceu, aguarde esta solicitacao inicial.');
    }
    return firebase.appCheck().getToken(!!cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN).then(function() {
      console.info('[NucleaAI] Token App Check solicitado com sucesso.');
    }).catch(function(e) {
      console.warn('[NucleaAI] Falha ao solicitar token App Check:', e);
    });
  } catch (e) {
    console.warn('[NucleaAI] App Check:', e);
    return Promise.resolve();
  }
}
 

var style = document.createElement('style');
style.textContent = [
  '.auth-google-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:8px;background:var(--sb-new-bg);border:1px solid var(--sb-tog-bd);color:var(--sb-tx-on);font-family:Inter,sans-serif;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;transition:background .18s,transform .15s;margin-bottom:4px;}',
  '.auth-google-btn:hover{background:var(--sb-item-on);transform:translateX(2px);}',
  '.auth-google-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}',
  '.auth-sync-row{display:flex;align-items:center;gap:6px;padding:4px 10px 6px;}',
  '.auth-sync-dot{width:6px;height:6px;border-radius:50%;background:#666;flex-shrink:0;transition:background .3s;}',
  '.auth-sync-label{font-size:10px;color:var(--sb-tx);font-family:Inter,sans-serif;}',
  '#sb-email{margin-top:1px;font-size:10px;color:var(--sb-tx);}',
  '.sb.col .auth-sync-row,.sb.col #sb-email{display:none!important;}',
  '.sb.col .auth-btn-label{display:none!important;}'
].join('');
document.head.appendChild(style);
 

var sbBot = document.querySelector('.sb-bot');
if (sbBot) {
  sbBot.innerHTML = [
    '<button class="nav-i" id="n-config" onclick="go(\'config\',this)">',
      '<span class="nav-ic"><img src="icons/setting (1).png" class="ic16" alt="" onerror="this.replaceWith(document.createTextNode(\'⚙\'))"/></span>',
      '<span class="nav-lb">Configurações</span>',
    '</button>',
    '<div class="sb-div"></div>',
 
    // NÃO logado
    '<div id="auth-logged-out">',
      '<button class="auth-google-btn" id="btn-google-login" onclick="authLogin()">',
        '<svg width="14" height="14" viewBox="0 0 48 48" style="flex-shrink:0">',
          '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13.2 17.9 9.5 24 9.5z"/>',
          '<path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.2-9.4 6.2-16.3z"/>',
          '<path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.8 10.7l7.9-6.1z"/>',
          '<path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2 1.4-4.6 2.2-8.2 2.2-6.1 0-11.4-3.7-13.3-9l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>',
        '</svg>',
        '<span class="auth-btn-label">Entrar com Google</span>',
      '</button>',
    '</div>',
 
    // Logado
    '<div id="auth-logged-in" style="display:none">',
      '<div class="sb-user">',
        '<div class="sb-av" id="sb-av" style="overflow:hidden;padding:0">',
          '<img id="sb-av-img" src="" alt="" style="width:100%;height:100%;border-radius:50%;display:none;object-fit:cover"/>',
          '<span id="sb-av-letter" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%">U</span>',
        '</div>',
        '<div style="flex:1;min-width:0;overflow:hidden">',
          '<div class="sb-un" id="sb-un">Usuário</div>',
          '<div id="sb-email" style="display:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>',
        '</div>',
      '</div>',
      '<div class="auth-sync-row">',
        '<div class="auth-sync-dot" id="auth-sync-dot"></div>',
        '<span class="auth-sync-label" id="auth-sync-label">Offline</span>',
      '</div>',
      '<button class="nav-i" onclick="authLogout()">',
        '<span class="nav-ic"><img src="icons/exit.png" class="ic16" alt="" onerror="this.replaceWith(document.createTextNode(\'↪\'))"/></span>',
        '<span class="nav-lb">Sair da conta</span>',
      '</button>',
    '</div>'
  ].join('');
}
 
function loadScript(src, cb) {
  var s = document.createElement('script');
  s.src = src; s.onload = cb;
  document.head.appendChild(s);
}
 
function prepareAppCheckDebugToken() {
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  if (!cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN) return;
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN === true
    ? true
    : String(cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN);
  console.info('[NucleaAI] App Check debug preparado antes de carregar o SDK.');
}

prepareAppCheckDebugToken();

var FIREBASE_SDK_BASE = 'https://www.gstatic.com/firebasejs/9.23.0/';
loadScript(FIREBASE_SDK_BASE + 'firebase-app-compat.js', function() {
  loadScript(FIREBASE_SDK_BASE + 'firebase-app-check-compat.js', function() {
    loadScript(FIREBASE_SDK_BASE + 'firebase-auth-compat.js', function() {
      loadScript(FIREBASE_SDK_BASE + 'firebase-firestore-compat.js', function() {
        init();
      });
    });
  });
});
 
})(); 
