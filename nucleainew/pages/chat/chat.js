// pages\chat\chat.js — NucleaAI (extraído verbatim do source original)
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

