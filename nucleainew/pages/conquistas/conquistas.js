// pages\conquistas\conquistas.js — NucleaAI (extraído verbatim do source original)
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

