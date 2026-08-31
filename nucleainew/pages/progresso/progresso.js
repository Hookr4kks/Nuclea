// pages\progresso\progresso.js — NucleaAI (extraído verbatim do source original)
function renderProg() {
  var p = S.prog;
  var taxa = p.total > 0 ? Math.round((p.acertos / p.total) * 100) : null;
  document.getElementById('st-tot').textContent = p.total;
  document.getElementById('st-ac').textContent  = taxa !== null ? taxa + '%' : '—';
  document.getElementById('st-fc').textContent  = S.fc.length;

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
      '<span class="prog-bar-tema">' + nome + '</span>' +
      '<span class="prog-bar-pct" style="color:' + cor + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="prog-bar-track"><div class="prog-bar-fill" style="width:' + pct + '%;background:' + cor + '"></div></div>' +
      '</div>';
  }
  document.getElementById('bar-ch').innerHTML = barH ||
    '<div class="prog-empty">Complete flashcards<br>para ver aqui.</div>';

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
  for (var i = 0; i < dif.length; i++) {
    var nome = dif[i][0], v = dif[i][1];
    var tot = v.acertos + v.erros;
    var errPct = Math.round((v.erros / tot) * 100);
    recH += '<div class="prog-rec-item">' +
      '<div class="prog-rec-icon">📌</div>' +
      '<div class="prog-rec-info">' +
      '<div class="prog-rec-tema">' + nome + '</div>' +
      '<div class="prog-rec-sub">' + errPct + '% de erros · ' + tot + ' tentativas</div>' +
      '</div>' +
      '<button class="prog-rec-btn" onclick="goFC(\'' + nome + '\')">Praticar →</button>' +
      '</div>';
  }
  document.getElementById('rec-list').innerHTML = recH ||
    '<div class="prog-empty">Aparece após praticar flashcards.</div>';
}

/* ── renderPizza — usa o novo donut menor (cx/cy=55, r=36) ── */
function renderPizza(acertos, erros) {
  var svg = document.getElementById('pizza-svg');
  var leg = document.getElementById('pizza-legend');
  var total = acertos + erros;

  if (total === 0) {
    svg.innerHTML = '<circle cx="55" cy="55" r="36" fill="none" stroke="rgba(128,128,128,0.12)" stroke-width="14"/>' +
      '<text x="55" y="59" text-anchor="middle" font-size="9" fill="rgba(128,128,128,0.35)" font-family="Inter,sans-serif">Sem dados</text>';
    leg.innerHTML = '<div class="prog-empty">Pratique flashcards<br>para ver aqui</div>';
    return;
  }

  var cx=55, cy=55, r=36, sw=14;
  var slices = [
    { val:acertos, color:'var(--gn)', label:'Acertos' },
    { val:erros,   color:'var(--rd)', label:'Erros'   }
  ].filter(function(s){ return s.val > 0; });

  var ang = -Math.PI/2, paths = '';
  for (var i = 0; i < slices.length; i++) {
    var s = slices[i], a = (s.val/total)*2*Math.PI, end = ang+a;
    var x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang);
    var x2=cx+r*Math.cos(end), y2=cy+r*Math.sin(end);
    if (slices.length === 1) {
      paths += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'" opacity=".85"/>';
    } else {
      paths += '<path d="M '+x1+' '+y1+' A '+r+' '+r+' 0 '+(a>Math.PI?1:0)+' 1 '+x2+' '+y2+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'" opacity=".85"/>';
    }
    ang = end;
  }

  var pct = Math.round((acertos/total)*100);
  svg.innerHTML =
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(128,128,128,0.10)" stroke-width="'+sw+'"/>'+
    paths+
    '<text x="'+cx+'" y="'+(cy-5)+'" text-anchor="middle" font-size="16" font-weight="600" fill="var(--tx)" font-family="Inter,sans-serif">'+pct+'%</text>'+
    '<text x="'+cx+'" y="'+(cy+10)+'" text-anchor="middle" font-size="8" fill="var(--tx2)" font-family="Inter,sans-serif">acerto</text>';

  var legH = '';
  for (var i = 0; i < slices.length; i++) {
    legH += '<div class="prog-leg-row">' +
      '<div class="prog-leg-dot" style="background:'+slices[i].color+'"></div>' +
      '<span class="prog-leg-label">'+slices[i].label+'</span>' +
      '<span class="prog-leg-val">'+slices[i].val+'</span>' +
      '</div>';
  }
  leg.innerHTML = legH;
}

