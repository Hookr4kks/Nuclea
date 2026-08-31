// pages\agenda\agenda.js — NucleaAI (extraído verbatim do source original)
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

