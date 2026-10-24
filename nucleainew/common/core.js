// common\core.js — NucleaAI (extraído verbatim do source original)
var S = {
  model: 'openai-fast',
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
  var savedModel = localStorage.getItem('fl_model');
  if (savedModel) S.model = savedModel;
  else S.model = aiDefaultModel();
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
  if (id === 'progresso')  { if (typeof renderProg === 'function') renderProg(); }
  if (id === 'agenda')     renderCal();
  if (id === 'tarefas')    renderTasks();
  if (id === 'historico')  renderHistorico('');
  if (id === 'conquistas') renderConquistas();
  if (id !== 'voz')        vozStop();
  closeDatePick();
}

// Re-renderiza a página ativa quando os fragmentos HTML terminam de carregar.
window.addEventListener('nucleai:pages-loaded', function() {
  var on = document.querySelector('.panel.on');
  if (on && on.id === 'p-progresso' && typeof renderProg === 'function') renderProg();
});

function showToast(msg, type) {
  type = type || 'ok';
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, type === 'err' ? 6000 : 3000);
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
//  callAI — provedores gratuitos (Groq/OpenRouter/Gemini/Pollinations).
//  Todos no formato OpenAI: POST → {choices[0].message}
// ──────────────────────────────────────────────────────────────────
var _aiModelsCache = null;
var _aiModelsCacheProvider = null;

function aiProviders() {
  return (typeof CONFIG !== 'undefined' && CONFIG.AI_PROVIDERS) || {};
}
function aiProviderId() {
  var providers = aiProviders();
  try {
    var p = localStorage.getItem('fl_aiProvider');
    if (p && providers[p]) return p;
  } catch(e) {}
  var def = (typeof CONFIG !== 'undefined' && CONFIG.AI_PROVIDER) || 'pollinations';
  return providers[def] ? def : 'pollinations';
}
function aiProvider() { return aiProviders()[aiProviderId()] || {}; }
function aiStoredKey(pid) {
  try {
    var k = localStorage.getItem('fl_aiKey_' + pid);
    if (k && k.trim()) return k.trim();
    if (pid === 'gemini') { // compatibilidade com a chave antiga
      var old = localStorage.getItem('fl_aiKey');
      if (old && old.trim()) return old.trim();
    }
  } catch(e) {}
  if (typeof CONFIG !== 'undefined' && CONFIG.AI_KEY && CONFIG.AI_KEY.trim()) return CONFIG.AI_KEY.trim();
  return '';
}
// Sem chave no provedor escolhido, cai para a Pollinations (funciona sem chave).
function aiEffectiveProviderId() {
  var pid = aiProviderId();
  if (pid === 'pollinations') return 'pollinations';
  return aiStoredKey(pid) ? pid : 'pollinations';
}
function aiIsPollinations() { return aiEffectiveProviderId() === 'pollinations'; }
function aiKey() { return aiStoredKey(aiEffectiveProviderId()); }
function aiResetModels() { _aiModelsCache = null; _aiModelsCacheProvider = null; }
function aiEndpoint() { return (aiProviders()[aiEffectiveProviderId()] || {}).baseUrl || 'https://text.pollinations.ai/openai'; }
function aiModelsUrl() { return (aiProviders()[aiEffectiveProviderId()] || {}).modelsUrl || 'https://text.pollinations.ai/models'; }
function aiDefaultModel() { return (aiProviders()[aiEffectiveProviderId()] || {}).defaultModel || 'openai-fast'; }
function aiErrorMessage(data, status) {
  if (Array.isArray(data)) data = data[0]; // a API Gemini devolve erros como array
  var err = (data && data.error) || (data && data.message) || '';
  if (err && typeof err === 'object') err = err.message || JSON.stringify(err);
  if (typeof err !== 'string') err = '';
  return 'IA ' + status + ': ' + (err || 'sem resposta do servidor');
}
// Só os modelos Flash de texto com free tier entram na lista do Gemini
// (exclui image/TTS/audio/live/pro que não são gratuitos ou não são chat).
function isFreeGeminiModel(id) {
  if (!/^gemini-/i.test(id)) return false;
  if (!/flash/i.test(id)) return false;
  if (/(image|tts|audio|live|transcribe|video|robot)/i.test(id)) return false;
  return true;
}
// Modelos que não são de chat (áudio, TTS, moderação...) ficam fora da lista.
function isChatModel(id) {
  return !/(whisper|tts|audio|guard|moderation|embed|rerank|transcribe)/i.test(id);
}
async function aiModels() {
  var pid = aiEffectiveProviderId();
  if (_aiModelsCache && _aiModelsCacheProvider === pid) return _aiModelsCache;
  try {
    var url = aiModelsUrl();
    var key = aiKey();
    var headers = {};
    if (url.indexOf('generativelanguage') >= 0) {
      if (key) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(key) + '&pageSize=200';
    } else if (key) {
      headers['Authorization'] = 'Bearer ' + key;
    }
    var r = await fetch(url, { headers: headers });
    var list = await r.json();
    if (Array.isArray(list)) {
      // Formato Pollinations: [{name, tier, vision, aliases}]
      _aiModelsCache = list;
    } else if (list && Array.isArray(list.models)) {
      // API nativa do Gemini: normaliza para o mesmo formato.
      _aiModelsCache = list.models.filter(function(m) {
        var id = (m.name || '').replace(/^models\//, '');
        var gen = m.supportedGenerationMethods;
        if (gen && Array.isArray(gen) && gen.indexOf('generateContent') < 0) return false;
        return isFreeGeminiModel(id);
      }).map(function(m) {
        return { name: (m.name || '').replace(/^models\//, ''), vision: true };
      });
    } else if (list && Array.isArray(list.data)) {
      // Formato OpenAI (Groq/OpenRouter): {data:[{id, architecture...}]}
      _aiModelsCache = list.data.filter(function(m) {
        var id = m.id || '';
        if (pid === 'openrouter') return /:free$/i.test(id) || id === 'openrouter/free';
        return isChatModel(id);
      }).map(function(m) {
        var mods = (m.architecture && m.architecture.input_modalities) || m.input_modalities || [];
        return { name: m.id, vision: mods.indexOf('image') >= 0 };
      });
    }
    _aiModelsCacheProvider = pid;
  } catch(e) {}
  return _aiModelsCache || [];
}
async function aiHasVision(model) {
  var list = await aiModels();
  var found = null;
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    if (m.name === model || (m.aliases || []).indexOf(model) >= 0) { found = m; break; }
  }
  if (!found) return true; // modelo desconhecido: deixa tentar
  return found.vision === true;
}
async function aiTryChat(url, model, content) {
  try {
    var headers = { 'Content-Type': 'application/json' };
    var body = { model: model, messages: [{ role: 'user', content: content }] };
    var key = aiKey();
    var isDirect = /^https?:/i.test(url);
    if (key) {
      if (isDirect) headers['Authorization'] = 'Bearer ' + key;
      else { body.key = key; body.provider = aiEffectiveProviderId(); } // proxy /api/chat
    }
    var res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) return { ok: false, error: aiErrorMessage(data, res.status), status: res.status };
    if (Array.isArray(data)) data = data[0];
    var msg = data && data.choices && data.choices[0] && data.choices[0].message;
    var text = msg && typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!text) return { ok: false, error: 'A IA devolveu resposta vazia.', status: res.status };
    return { ok: true, text: text };
  } catch(e) {
    // rede/CORS bloqueado → tenta a próxima rota (proxy /api/chat)
    return { ok: false, error: '', status: 0 };
  }
}

async function callAI(prompt, image) {
  var model = S.model || aiDefaultModel();
  var content = image
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image.dataUrl } }]
    : prompt;

  if (image && !(await aiHasVision(model))) {
    throw new Error('O modelo atual ("' + model + '") não analisa imagens. Apague o anexo ou escolha outro modelo em Configurações.');
  }

  // Tenta o modelo escolhido e, se ele não estiver liberado, o padrão do provedor.
  var models = [model];
  if (model !== aiDefaultModel()) models.push(aiDefaultModel());

  var lastError = '';
  for (var i = 0; i < models.length; i++) {
    var routes = [aiEndpoint(), '/api/chat'];
    for (var j = 0; j < routes.length; j++) {
      var out = await aiTryChat(routes[j], models[i], content);
      if (out.ok) return out.text;
      // Proxy ausente no host (404/405/501) não conta como erro da IA.
      var proxyOff = routes[j] === '/api/chat' && (out.status === 404 || out.status === 405 || out.status === 501);
      if (proxyOff) continue;
      if (out.error) {
        lastError = out.error;
        // Com provedor + chave, o erro é definitivo — o proxy não resolveria.
        if (!aiIsPollinations()) break;
      }
      // erro vazio = rede/CORS → tenta a próxima rota (proxy)
    }
  }

  // Último recurso: endpoint de texto puro da Pollinations (só sem chave).
  // Só serve para texto — a URL não comporta imagem nem prompt gigante.
  if (!image && aiIsPollinations()) {
    try {
      var plain = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt.slice(0, 1800)));
      if (plain.ok) {
        var t = (await plain.text()).trim();
        if (t) return t;
      }
    } catch(e) {}
  }

  throw new Error(lastError || 'Não consegui falar com a IA. Tente de novo em alguns segundos.');
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

