// common\core.js — NucleaAI (extraído verbatim do source original)
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
document.addEventListener('click', function(e) {
  var w = document.getElementById('date-pick-wrap');
  if (w && !w.contains(e.target)) closeDatePick();
  var ag = document.querySelector('.agenda-pick-row');
  if (ag && !ag.contains(e.target)) closeAgendaPickers();
  if (!e.target.closest || !e.target.closest('.tk-select-wrap')) closeTaskSelects();
  if (!e.target.closest || !e.target.closest('.cfg-select-wrap')) closeCfgSelects();
});
// ──────────────────────────────────────────────────────────────────
// Fila + rate limit + retry para a API Mistral (evita HTTP 429)
// ──────────────────────────────────────────────────────────────────
var AI_MIN_GAP_MS = 1200;   // espaçamento mínimo entre chamadas
var AI_MAX_RETRIES = 4;     // tentativas extras quando vier 429
var _aiChain = Promise.resolve();
var _aiLastCall = 0;

function _sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// Serializa: cada chamada espera a anterior terminar + o intervalo mínimo.
function _aiQueue(fn) {
  var run = _aiChain.then(async function() {
    var wait = AI_MIN_GAP_MS - (Date.now() - _aiLastCall);
    if (wait > 0) await _sleep(wait);
    try { return await fn(); }
    finally { _aiLastCall = Date.now(); }
  });
  _aiChain = run.catch(function() {}); // um erro não trava a fila
  return run;
}

function _retryAfterMs(res, attempt) {
  var h = res.headers && res.headers.get && res.headers.get('Retry-After');
  if (h) {
    var secs = parseFloat(h);
    if (!isNaN(secs)) return secs * 1000;
  }
  // backoff exponencial com jitter: ~2s, 4s, 8s, 16s
  return Math.round((Math.pow(2, attempt) * 1000) * (1 + Math.random() * 0.3));
}

async function _fetchWithRetry(url, options) {
  var lastRes = null;
  for (var attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    var res = await fetch(url, options);
    if (res.status !== 429 && res.status !== 503) return res;
    lastRes = res;
    if (attempt === AI_MAX_RETRIES) break;
    var delay = _retryAfterMs(res, attempt + 1);
    console.warn('[NucleaAI] ' + res.status + ' da Mistral. Nova tentativa em ' + delay + 'ms (' + (attempt + 1) + '/' + AI_MAX_RETRIES + ')');
    await _sleep(delay);
  }
  return lastRes;
}

async function callAI(prompt, image) {
  return _aiQueue(function() { return _callAIOnce(prompt, image); });
}

async function _callAIOnce(prompt, image) {
  var key = S.apiKey || (document.getElementById('api-key') && document.getElementById('api-key').value.trim());
  var model = S.model || 'open-mixtral-8x7b';
  var content = image
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: image.dataUrl }]
    : prompt;

  if (!key) {
    var backendHeaders = { 'Content-Type': 'application/json' };
    try {
      if (window.firebase && firebase.appCheck) {
        var appCheck = await firebase.appCheck().getToken(false);
        if (appCheck && appCheck.token) backendHeaders['X-Firebase-AppCheck'] = appCheck.token;
      }
    } catch(e) {
      console.warn('[NucleaAI] App Check para backend:', e);
    }

    var apiRes = await _fetchWithRetry('/api/mistral', {
      method: 'POST',
      headers: backendHeaders,
      body: JSON.stringify({ model: model, content: content })
    });
    var apiData = await apiRes.json().catch(function() { return {}; });
    if (!apiRes.ok) {
      if (apiRes.status === 429) throw new Error('Limite de uso da IA atingido. Aguarde alguns segundos e tente de novo.');
      throw new Error('Mistral ' + apiRes.status + ': ' + (apiData.error || 'Backend indisponivel'));
    }
    return apiData.resposta || '';
  }

  var res = await _fetchWithRetry('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, max_tokens: 1000, messages: [{ role: 'user', content: content }] })
  });
  if (!res.ok) {
    var e = await res.json().catch(function() { return {}; });
    if (res.status === 429) throw new Error('Limite de uso da IA atingido. Aguarde alguns segundos e tente de novo.');
    throw new Error('Mistral ' + res.status + ': ' + (e.message || 'Verifique sua chave'));
  }
  return (await res.json()).choices[0].message.content;
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
