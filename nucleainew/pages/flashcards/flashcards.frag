<!-- FLASHCARDS -->
<div class="panel panel-flashcards" id="p-flashcards">

  <!-- Estado 1 — Configuração -->
  <section class="fc-setup" id="fc-setup" aria-labelledby="fc-setup-title">
    <form class="fc-setup-card" id="fc-setup-form" novalidate onsubmit="event.preventDefault(); genFC();">
      <div class="fc-setup-ic" aria-hidden="true">🃏</div>
      <h2 class="fc-setup-title" id="fc-setup-title">Nova sessão de estudo</h2>
      <p class="fc-setup-sub">Diga o que quer estudar e a IA cria os flashcards para você.</p>

      <div class="fc-setup-field">
        <label class="fc-setup-label" for="fc-tema">Tema de estudo</label>
        <input class="field fc-setup-input" id="fc-tema" type="text" maxlength="120" autocomplete="off"
          placeholder="Ex.: Fotossíntese, Revolução Francesa…"
          aria-describedby="fc-tema-err" oninput="fcSetError('')" />
        <div class="fc-field-err" id="fc-tema-err" role="alert"></div>
      </div>

      <div class="fc-setup-row">
        <div class="fc-setup-field">
          <span class="fc-setup-label" id="fc-qtd-lbl">Quantidade</span>
          <div class="fc-stepper fc-stepper--lg" role="group" aria-labelledby="fc-qtd-lbl">
            <button type="button" class="fc-step-btn" onclick="fcStepQtd(-1)" aria-label="Diminuir quantidade">−</button>
            <span class="fc-step-val" id="fc-qtd-inline" aria-live="polite">5</span>
            <button type="button" class="fc-step-btn" onclick="fcStepQtd(1)" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>

        <div class="fc-setup-field fc-setup-field--grow">
          <span class="fc-setup-label" id="fc-dif-lbl">Nível de dificuldade</span>
          <div class="fc-dif-pills" id="fc-dif-pills" role="group" aria-labelledby="fc-dif-lbl">
            <button type="button" class="fc-dif-pill active" data-v="basico"        onclick="fcSetDif(this)" aria-pressed="true">Básico</button>
            <button type="button" class="fc-dif-pill"        data-v="intermediario" onclick="fcSetDif(this)" aria-pressed="false">Médio</button>
            <button type="button" class="fc-dif-pill"        data-v="avancado"      onclick="fcSetDif(this)" aria-pressed="false">Avançado</button>
            <button type="button" class="fc-dif-pill"        data-v="misto"         onclick="fcSetDif(this)" aria-pressed="false">Misto</button>
          </div>
        </div>
      </div>

      <button class="btn pr fc-start-btn" id="btn-gen" type="submit">Iniciar sessão</button>
      <div class="fc-gen-status" id="fc-gen-status" role="status" aria-live="polite"></div>
    </form>
  </section>

  <!-- Estado 2 — Sessão em andamento (modo de estudo dedicado) -->
  <section class="fc-session" id="fc-session" hidden aria-label="Sessão de flashcards">
    <div class="fc-session-top">
      <button type="button" class="fc-exit-btn" onclick="fcExitSession()">← Encerrar</button>
      <span class="fc-session-theme" id="fc-session-theme"></span>
      <span class="fc-deck-info" id="fc-deck-info" aria-live="polite">0 / 0</span>
    </div>
    <div class="fc-deck-progress" id="fc-deck-progress">
      <div class="fc-deck-bar-wrap" id="fc-deck-bar" role="progressbar" aria-label="Progresso da sessão" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="fc-deck-bar-fill" id="fc-deck-bar-fill" style="width:0%"></div>
      </div>
    </div>
    <div id="fc-stage"></div>
  </section>

</div>
