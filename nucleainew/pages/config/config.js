// pages\config\config.js — NucleaAI (extraído verbatim do source original)
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
function saveKey() {
  S.apiKey = document.getElementById('api-key').value.trim();
  S.model  = document.getElementById('mdl-sel').value;
  var badge = document.getElementById('badge-api');
  if (badge) badge.textContent = S.apiKey ? 'Chave local' : 'Backend Vercel';
  saveLS();
  showToast(S.apiKey ? 'Chave local salva!' : 'Backend Vercel ativo!');
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
function togAcc(id) {
  var items = document.querySelectorAll('.acc-item');
  var el = document.getElementById(id);
  var isOpen = el.classList.contains('open');
  items.forEach(function(i) { i.classList.remove('open'); });
  if (!isOpen) el.classList.add('open');
}

