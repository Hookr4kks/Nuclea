<!-- PROGRESSO -->
<div class="panel panel-progresso" id="p-progresso">
  <div class="prog-layout">

    <!-- Card principal: desempenho geral -->
    <section class="prog-card prog-hero" aria-labelledby="prog-hero-title">
      <h2 class="prog-card-title" id="prog-hero-title">Desempenho geral</h2>
      <div class="prog-hero-body">
        <div class="prog-hero-chart">
          <svg id="pizza-svg" class="prog-donut" viewBox="0 0 220 220" role="img" aria-label="Gráfico de desempenho geral"></svg>
          <ul class="prog-legend" id="pizza-legend" aria-label="Legenda do gráfico"></ul>
        </div>
        <dl class="prog-hero-stats">
          <div class="prog-kpi">
            <dt class="prog-kpi-lbl">Total de tentativas</dt>
            <dd class="prog-kpi-val" id="st-tot">0</dd>
          </div>
          <div class="prog-kpi">
            <dt class="prog-kpi-lbl">Melhor tema</dt>
            <dd class="prog-kpi-val prog-kpi-val--gn prog-kpi-val--txt" id="st-best">—</dd>
            <dd class="prog-kpi-sub" id="st-best-sub">Pratique para descobrir</dd>
          </div>
          <div class="prog-kpi">
            <dt class="prog-kpi-lbl">Temas estudados</dt>
            <dd class="prog-kpi-val prog-kpi-val--yw" id="st-temas">0</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Coluna direita: painéis recolhíveis -->
    <div class="prog-side">

      <section class="prog-card prog-acc" id="prog-acc-tema">
        <h2 class="prog-acc-h">
          <button type="button" class="prog-acc-btn" aria-expanded="true" aria-controls="prog-acc-tema-body" onclick="toggleProgPanel('tema')" title="Recolher">
            <svg class="prog-acc-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span class="prog-acc-title">Por tema</span>
            <span class="prog-acc-count" id="tema-count"></span>
            <svg class="prog-acc-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </h2>
        <div class="prog-acc-wrap" id="prog-acc-tema-body">
          <div class="prog-acc-inner">
            <div class="prog-acc-content">
              <div class="prog-bar-list" id="bar-ch">
                <div class="prog-empty">Complete flashcards<br>para ver aqui.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="prog-card prog-acc" id="prog-acc-rec">
        <h2 class="prog-acc-h">
          <button type="button" class="prog-acc-btn" aria-expanded="true" aria-controls="prog-acc-rec-body" onclick="toggleProgPanel('rec')" title="Recolher">
            <svg class="prog-acc-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.56"/></svg>
            <span class="prog-acc-title">Recomendações para revisar</span>
            <span class="prog-acc-count" id="rec-count"></span>
            <svg class="prog-acc-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </h2>
        <div class="prog-acc-wrap" id="prog-acc-rec-body">
          <div class="prog-acc-inner">
            <div class="prog-acc-content">
              <div class="prog-recs" id="rec-list">
                <div class="prog-empty">Aparece após praticar flashcards.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</div>
