// pages\tarefas\tarefas.js — NucleaAI (extraído verbatim do source original)
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

