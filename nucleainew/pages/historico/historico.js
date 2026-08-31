// pages\historico\historico.js — NucleaAI (extraído verbatim do source original)
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

