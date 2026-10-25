// pages\progresso\progresso.js — NucleaAI
// escH e setTxt são utilitários globais também usados por outras páginas.
function escH(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function setTxt(id, v) {
  var e = document.getElementById(id);
  if (e) e.textContent = v;
}

/* ── Painéis recolhíveis (só apresentação; nunca mexe nos dados) ── */
var PROG_UI_KEY = 'fl_prog_ui';
var PROG_PANELS = { tema: 'prog-acc-tema', rec: 'prog-acc-rec' };

function progUiLoad() {
  try {
    var r = JSON.parse(localStorage.getItem(PROG_UI_KEY) || '{}');
    return (r && typeof r === 'object') ? r : {};
  } catch(e) { return {}; }
}
function progUiSave(st) {
  try { localStorage.setItem(PROG_UI_KEY, JSON.stringify(st)); } catch(e) {}
}
function setProgPanel(key, collapsed) {
  var card = document.getElementById(PROG_PANELS[key]);
  if (!card) return;
  var btn  = card.querySelector('.prog-acc-btn');
  var wrap = card.querySelector('.prog-acc-wrap');
  card.classList.toggle('collapsed', !!collapsed);
  if (btn) {
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.title = collapsed ? 'Expandir' : 'Recolher';
  }
  if (wrap) wrap.inert = !!collapsed; // conteúdo recolhido não recebe foco
}
function applyProgPanelState() {
  var st = progUiLoad();
  Object.keys(PROG_PANELS).forEach(function(k) { setProgPanel(k, !!st[k]); });
}
function toggleProgPanel(key) {
  var card = document.getElementById(PROG_PANELS[key]);
  if (!card) return;
  var collapsed = !card.classList.contains('collapsed');
  setProgPanel(key, collapsed);
  var st = progUiLoad();
  st[key] = collapsed;
  progUiSave(st);
}

function renderProg() {
  // Se o progresso.frag estiver incompleto/desatualizado, avisa em vez de quebrar em silêncio
  var need = ['st-tot','st-best','st-best-sub','st-temas','pizza-svg','pizza-legend','bar-ch','rec-list'];
  var miss = need.filter(function(id){ return !document.getElementById(id); });
  if (miss.length) {
    console.warn('[Progresso] progresso.frag incompleto ou em cache. Faltam os elementos:', miss.join(', '));
    return;
  }
  applyProgPanelState();

  // Garante que S.prog sempre tem o formato esperado (evita erro com dado corrompido/vazio)
  if (!S.prog || typeof S.prog !== 'object') S.prog = {};
  var p = S.prog;
  p.total   = Number(p.total)   || 0;
  p.acertos = Number(p.acertos) || 0;
  p.erros   = Number(p.erros)   || 0;
  if (!p.temas || typeof p.temas !== 'object') p.temas = {};
  document.getElementById('st-tot').textContent = p.total;

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
      '<span class="prog-bar-tema">' + escH(nome) + '</span>' +
      '<span class="prog-bar-pct" style="color:' + cor + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="prog-bar-track"><div class="prog-bar-fill" style="width:' + pct + '%;background:' + cor + '"></div></div>' +
      '</div>';
  }
  document.getElementById('bar-ch').innerHTML = barH ||
    '<div class="prog-empty">Complete flashcards<br>para ver aqui.</div>';
  setTxt('tema-count', temas.length ? String(temas.length) : '');

  // Indicadores: temas estudados e melhor tema (prefere temas com 2+ tentativas; desempate por mais tentativas)
  setTxt('st-temas', String(temas.length));
  var cand = temas.filter(function(x) { return x[1].acertos + x[1].erros >= 2; });
  if (!cand.length) cand = temas.slice();
  var best = null, bestPct = -1, bestTot = 0;
  for (var b = 0; b < cand.length; b++) {
    var bt = cand[b][1].acertos + cand[b][1].erros;
    var bp = Math.round((cand[b][1].acertos / bt) * 100);
    if (bp > bestPct || (bp === bestPct && bt > bestTot)) { best = cand[b][0]; bestPct = bp; bestTot = bt; }
  }
  var bestEl = document.getElementById('st-best');
  setTxt('st-best', best !== null ? best : '—');
  if (bestEl) bestEl.title = best !== null ? best : '';
  setTxt('st-best-sub', best !== null ? bestPct + '% de acerto · ' + bestTot + (bestTot === 1 ? ' tentativa' : ' tentativas') : 'Pratique para descobrir');

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
  for (var j = 0; j < dif.length; j++) {
    var nm = dif[j][0], vv = dif[j][1];
    var tt = vv.acertos + vv.erros;
    var errPct = Math.round((vv.erros / tt) * 100);
    recH += '<div class="prog-rec-item">' +
      '<div class="prog-rec-icon">📌</div>' +
      '<div class="prog-rec-info">' +
      '<div class="prog-rec-tema">' + escH(nm) + '</div>' +
      '<div class="prog-rec-sub">' + errPct + '% de erros · ' + tt + ' tentativas</div>' +
      '</div>' +
      '<button class="prog-rec-btn" data-tema="' + escH(nm) + '" onclick="goFC(this.dataset.tema)">Praticar →</button>' +
      '</div>';
  }
  document.getElementById('rec-list').innerHTML = recH ||
    '<div class="prog-empty">Aparece após praticar flashcards.</div>';
  setTxt('rec-count', dif.length ? String(dif.length) : '');
}

/* ── renderPizza — rosca grande; só a % de acerto no centro; legenda com as categorias reais ── */
function renderPizza(acertos, erros) {
  var svg = document.getElementById('pizza-svg');
  var leg = document.getElementById('pizza-legend');
  var total = acertos + erros;
  var cx = 110, cy = 110, r = 82, sw = 28;

  var slices = [
    { val: acertos, color: 'var(--gn)', label: 'Acertos' },
    { val: erros,   color: 'var(--rd)', label: 'Erros'   }
  ];

  var trilha = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(128,128,128,0.14)" stroke-width="'+sw+'"/>';

  if (total === 0) {
    svg.innerHTML = trilha +
      '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central" font-size="46" font-weight="700" fill="var(--tx2)" font-family="Inter,sans-serif">—</text>';
    svg.setAttribute('aria-label', 'Gráfico de desempenho geral: sem dados ainda');
  } else {
    var vis = slices.filter(function(s){ return s.val > 0; });
    var ang = -Math.PI/2, paths = '';
    for (var i = 0; i < vis.length; i++) {
      var s = vis[i], a = (s.val/total)*2*Math.PI, end = ang+a;
      var x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang);
      var x2=cx+r*Math.cos(end), y2=cy+r*Math.sin(end);
      if (vis.length === 1) {
        paths += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'"/>';
      } else {
        paths += '<path d="M '+x1+' '+y1+' A '+r+' '+r+' 0 '+(a>Math.PI?1:0)+' 1 '+x2+' '+y2+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'"/>';
      }
      ang = end;
    }
    var pct = Math.round((acertos/total)*100);
    svg.innerHTML = trilha + paths +
      '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central" font-size="46" font-weight="700" fill="var(--tx)" font-family="Inter,sans-serif">'+pct+'%</text>';
    svg.setAttribute('aria-label', 'Gráfico de desempenho geral: ' + pct + '% de acerto, ' + acertos + ' acertos e ' + erros + ' erros');
  }

  // Legenda: uma linha por categoria real (Acertos / Erros), sempre visível
  var pctAc = total > 0 ? Math.round((acertos/total)*100) : 0;
  var pcts  = [pctAc, total > 0 ? 100 - pctAc : 0];
  var legH = '';
  for (var j = 0; j < slices.length; j++) {
    legH += '<li class="prog-leg-row">' +
      '<span class="prog-leg-dot" style="background:'+slices[j].color+'" aria-hidden="true"></span>' +
      '<span class="prog-leg-label">'+slices[j].label+'</span>' +
      '<span class="prog-leg-val">'+slices[j].val+'</span>' +
      (total > 0 ? '<span class="prog-leg-pct">'+pcts[j]+'%</span>' : '') +
      '</li>';
  }
  if (total === 0) legH += '<li class="prog-leg-hint">Pratique flashcards para ver seus resultados.</li>';
  leg.innerHTML = legH;
}
