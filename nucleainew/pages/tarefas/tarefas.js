// pages\tarefas\tarefas.js — NucleaAI
// Quadro Kanban. Cada tarefa: { id, text, desc?, prio, cat, date, status, done }.
// A agenda NÃO guarda cópia das tarefas: ela deriva os eventos direto de S.tasks (ver agenda.js),
// então título/data/exclusão ficam sempre sincronizados e nunca duplicam.
var KB_STATUS = ['todo', 'doing', 'done'];
var KB_LABEL  = { todo: 'A Fazer', doing: 'Em Progresso', done: 'Concluído' };
var KB_UI_KEY = 'fl_tk_ui';
var TK_PRIO   = {
  alta:  { label: 'Alta',  glyph: '▲', color: '#f87171' },
  media: { label: 'Média', glyph: '◆', color: '#fbbf24' },
  baixa: { label: 'Baixa', glyph: '▼', color: '#4ade80' }
};
var TK_CAT = {
  geral:   { label: 'Geral',   ico: '📁' },
  estudo:  { label: 'Estudo',  ico: '📚' },
  projeto: { label: 'Projeto', ico: '🛠' },
  pessoal: { label: 'Pessoal', ico: '👤' },
  urgente: { label: 'Urgente', ico: '⚡' }
};

function migrateTask(t) {
  if (!t.status) t.status = t.done ? 'done' : 'todo';
  if (!t.cat) t.cat = 'geral';
  return t;
}

function findTask(id) {
  for (var i = 0; i < S.tasks.length; i++) { if (S.tasks[i].id === id) return S.tasks[i]; }
  return null;
}

function newTaskId() {
  var id = Date.now();
  while (findTask(id)) id++;
  return id;
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
  if (!bd) return;
  if (n > 0) { bd.textContent = n; bd.style.display = ''; }
  else bd.style.display = 'none';
}

/* ── Colunas minimizáveis (só apresentação; as tarefas continuam todas nos dados) ── */
function kbUiLoad() {
  try {
    var r = JSON.parse(localStorage.getItem(KB_UI_KEY) || '{}');
    return (r && typeof r === 'object') ? r : {};
  } catch(e) { return {}; }
}
function kbUiSave(st) {
  try { localStorage.setItem(KB_UI_KEY, JSON.stringify(st)); } catch(e) {}
}
function applyKbColState() {
  var st = kbUiLoad();
  KB_STATUS.forEach(function(s) {
    var col = document.getElementById('kb-col-' + s);
    if (!col) return;
    var collapsed = !!st[s];
    col.classList.toggle('kb-col--collapsed', collapsed);
    var btn = col.querySelector('.kb-col-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.title = collapsed ? 'Expandir coluna' : 'Minimizar coluna';
      btn.setAttribute('aria-label', (collapsed ? 'Expandir coluna ' : 'Minimizar coluna ') + KB_LABEL[s]);
    }
    var cards = document.getElementById('kb-cards-' + s);
    if (cards) cards.inert = collapsed;
  });
}
function toggleKbCol(status) {
  var st = kbUiLoad();
  st[status] = !st[status];
  kbUiSave(st);
  applyKbColState();
}

/* ── Selects customizados (usados pelo campo "Tipo" do formulário) ── */
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

/* ── Formulário sob demanda (criar / editar uma tarefa por vez) ── */
var _tkEditId = null;
var _tkStatus = 'todo';
var _tkOpener = null;

function tkSetErr(msg) {
  var el = document.getElementById('tk-in-err');
  var inp = document.getElementById('tk-in');
  if (el) el.textContent = msg || '';
  if (inp) {
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    inp.classList.toggle('tk-input-err', !!msg);
  }
}

function tkSyncDateLabel() {
  var l = document.getElementById('date-pick-label');
  if (!l) return;
  if (S.dpSel) {
    var p = S.dpSel.split('-');
    l.textContent = p[2] + ' ' + MOS3[parseInt(p[1], 10) - 1];
  } else {
    l.textContent = 'Sem data';
  }
}

function openTaskForm(status, id) {
  var modal = document.getElementById('tk-modal');
  if (!modal) return;
  closeTaskSelects();
  closeDatePick();
  var t = (id != null) ? findTask(id) : null;
  _tkEditId = t ? t.id : null;
  _tkStatus = t ? (t.status || 'todo') : (KB_LABEL[status] ? status : 'todo');
  _tkOpener = document.activeElement;

  setTxt('tk-modal-title', t ? 'Editar tarefa' : 'Nova tarefa');
  setTxt('tk-modal-col', KB_LABEL[_tkStatus]);
  setTxt('tk-submit', t ? 'Salvar' : 'Criar tarefa');
  document.getElementById('tk-in').value = t ? t.text : '';
  document.getElementById('tk-desc').value = t ? (t.desc || '') : '';
  var prio = (t && TK_PRIO[t.prio]) ? t.prio : 'media';
  var radio = document.querySelector('#tk-form input[name="tk-pr"][value="' + prio + '"]');
  if (radio) radio.checked = true;
  var cat = document.getElementById('tk-cat');
  if (cat) { cat.value = (t && TK_CAT[t.cat]) ? t.cat : 'geral'; syncTaskSelect('tk-cat'); }

  S.dpSel = (t && t.date) ? t.date : '';
  if (S.dpSel) {
    var p = S.dpSel.split('-');
    S.dpY = parseInt(p[0], 10); S.dpM = parseInt(p[1], 10) - 1;
  } else {
    S.dpY = today.getFullYear(); S.dpM = today.getMonth();
  }
  tkSyncDateLabel();
  tkSetErr('');

  modal.hidden = false;
  setTimeout(function() {
    var inp = document.getElementById('tk-in');
    if (inp) inp.focus();
  }, 30);
}

function closeTaskForm() {
  var modal = document.getElementById('tk-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  closeDatePick();
  closeTaskSelects();
  // limpa o estado temporário do formulário
  _tkEditId = null;
  S.dpSel = '';
  tkSyncDateLabel();
  tkSetErr('');
  var f = document.getElementById('tk-in'); if (f) f.value = '';
  f = document.getElementById('tk-desc'); if (f) f.value = '';
  var op = _tkOpener; _tkOpener = null;
  if (op && op.focus && document.contains(op)) op.focus();
}

function submitTaskForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  var inp = document.getElementById('tk-in');
  var title = inp ? inp.value.trim() : '';
  if (!title) {
    tkSetErr('Dê um título para a tarefa.');
    if (inp) inp.focus();
    return false;
  }
  var desc = (document.getElementById('tk-desc').value || '').trim();
  var prioEl = document.querySelector('#tk-form input[name="tk-pr"]:checked');
  var prio = prioEl && TK_PRIO[prioEl.value] ? prioEl.value : 'media';
  var catEl = document.getElementById('tk-cat');
  var cat = catEl && TK_CAT[catEl.value] ? catEl.value : 'geral';
  var date = S.dpSel || '';

  if (_tkEditId != null) {
    var t = findTask(_tkEditId);
    if (t) { t.text = title; t.desc = desc; t.prio = prio; t.cat = cat; t.date = date; }
    showToast('✏️ Tarefa atualizada!');
  } else {
    S.tasks.unshift({ id: newTaskId(), text: title, desc: desc, prio: prio, cat: cat, date: date, status: _tkStatus, done: _tkStatus === 'done' });
    // se a coluna estava minimizada, abre para a pessoa ver a tarefa criada
    var st = kbUiLoad();
    if (st[_tkStatus]) { st[_tkStatus] = false; kbUiSave(st); }
    showToast('☑ Tarefa adicionada!');
  }
  closeTaskForm();
  updBadge(); renderTasks(); saveLS();
  checkAchievements();
  return false;
}

document.addEventListener('keydown', function(e) {
  var modal = document.getElementById('tk-modal');
  if (!modal || modal.hidden) return;
  if (e.key === 'Escape') {
    var pop = document.getElementById('date-pick-pop');
    if (pop && pop.classList.contains('open')) closeDatePick();
    else if (document.querySelector('.tk-select-wrap.open')) closeTaskSelects();
    else closeTaskForm();
    e.preventDefault();
    return;
  }
  if (e.key === 'Tab') {
    var dlg = document.getElementById('tk-form');
    var els = Array.prototype.filter.call(
      dlg.querySelectorAll('input, textarea, button, select'),
      function(el) { return !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null; }
    );
    if (!els.length) return;
    var first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ── Arrastar e soltar ── */
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

/* ── Renderização ── */
function renderTasks() {
  S.tasks = S.tasks.map(migrateTask);
  var cols = { todo: [], doing: [], done: [] };
  var nextSt = { todo: 'doing', doing: 'done', done: 'todo' };
  var nextLbl = { todo: '▶ Iniciar', doing: '✓ Concluir', done: '↺ Reabrir' };
  for (var i = 0; i < S.tasks.length; i++) {
    var t = S.tasks[i];
    if (cols[t.status]) cols[t.status].push(t);
  }
  KB_STATUS.forEach(function(s) {
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
  KB_STATUS.forEach(function(status) {
    var container = document.getElementById('kb-cards-' + status);
    if (!container) return;
    if (!cols[status].length) { container.innerHTML = ''; return; }
    var h = '';
    for (var i = 0; i < cols[status].length; i++) {
      var t = cols[status][i];
      var pk = TK_PRIO[t.prio] ? t.prio : 'media';
      var pr = TK_PRIO[pk];
      var cat = TK_CAT[t.cat] || TK_CAT.geral;
      var venc = (t.date && status !== 'done') ? verificaVencimento(t.date) : null;
      h += '<div class="kb-card kb-card--' + pk + (status === 'done' ? ' kb-card--done' : '') + '" draggable="true" ondragstart="dragStart(event,' + t.id + ')" ondragend="dragEnd()" ondragover="event.preventDefault()" ondrop="event.stopPropagation();dropTask(event,\'' + status + '\')">' +
        '<div class="kb-card-stripe" style="background:' + pr.color + '"></div>' +
        '<div class="kb-card-body">' +
        '<div class="kb-card-text">' + escH(t.text) + '</div>' +
        (t.desc ? '<div class="kb-card-desc">' + escH(t.desc) + '</div>' : '') +
        '<div class="kb-card-tags">' +
        '<span class="kb-tag kb-tag--cat">' + cat.ico + ' ' + cat.label + '</span>' +
        '<span class="kb-tag kb-tag--' + pk + '">' + pr.glyph + ' ' + pr.label + '</span>' +
        (t.date ? '<span class="kb-tag kb-tag--date' + (venc === 'vencida' ? ' kb-tag--venc' : venc === 'hoje' ? ' kb-tag--hoje' : '') + '">' + fmtD(t.date) + (venc === 'vencida' ? ' ⚠' : venc === 'hoje' ? ' 📅' : '') + '</span>' : '') +
        '</div>' +
        '<div class="kb-card-actions">' +
        '<button type="button" class="kb-btn-move" onclick="moveTask(' + t.id + ',\'' + nextSt[status] + '\')">' + nextLbl[status] + '</button>' +
        '<span class="kb-card-icons">' +
        '<button type="button" class="kb-btn-edit" onclick="openTaskForm(null,' + t.id + ')" title="Editar tarefa" aria-label="Editar tarefa">✎</button>' +
        '<button type="button" class="kb-btn-del" onclick="delTask(' + t.id + ')" title="Excluir tarefa" aria-label="Excluir tarefa">✕</button>' +
        '</span>' +
        '</div></div></div>';
    }
    container.innerHTML = h;
  });
  applyKbColState();
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
