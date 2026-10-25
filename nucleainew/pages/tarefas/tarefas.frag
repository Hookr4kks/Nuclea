<!-- TAREFAS -->
<div class="panel panel-tarefas" id="p-tarefas">

  <div class="kb-progress-bar-wrap" id="kb-progress-wrap">
    <div class="kb-progress-bar" id="kb-progress-fill"></div>
    <span class="kb-progress-label" id="kb-progress-label">0 concluídas</span>
  </div>

  <div class="kb-board" id="kb-board">

    <div class="kb-col" id="kb-col-todo" ondragover="event.preventDefault()" ondrop="dropTask(event,'todo')">
      <div class="kb-col-hd">
        <button type="button" class="kb-col-toggle" onclick="toggleKbCol('todo')" aria-expanded="true" aria-controls="kb-cards-todo" title="Minimizar coluna" aria-label="Minimizar coluna A Fazer">
          <span class="kb-col-chev" aria-hidden="true">▾</span>
          <span class="kb-col-dot" style="background:#6c8ef5"></span>
          <span class="kb-col-title">A Fazer</span>
          <span class="kb-col-cnt" id="kb-cnt-todo">0</span>
        </button>
        <button type="button" class="kb-col-add" onclick="openTaskForm('todo')" aria-label="Adicionar tarefa em A Fazer" title="Nova tarefa">+</button>
      </div>
      <div class="kb-cards" id="kb-cards-todo"></div>
    </div>

    <div class="kb-col" id="kb-col-doing" ondragover="event.preventDefault()" ondrop="dropTask(event,'doing')">
      <div class="kb-col-hd">
        <button type="button" class="kb-col-toggle" onclick="toggleKbCol('doing')" aria-expanded="true" aria-controls="kb-cards-doing" title="Minimizar coluna" aria-label="Minimizar coluna Em Progresso">
          <span class="kb-col-chev" aria-hidden="true">▾</span>
          <span class="kb-col-dot" style="background:#fbbf24"></span>
          <span class="kb-col-title">Em Progresso</span>
          <span class="kb-col-cnt" id="kb-cnt-doing">0</span>
        </button>
        <button type="button" class="kb-col-add" onclick="openTaskForm('doing')" aria-label="Adicionar tarefa em Em Progresso" title="Nova tarefa">+</button>
      </div>
      <div class="kb-cards" id="kb-cards-doing"></div>
    </div>

    <div class="kb-col" id="kb-col-done" ondragover="event.preventDefault()" ondrop="dropTask(event,'done')">
      <div class="kb-col-hd">
        <button type="button" class="kb-col-toggle" onclick="toggleKbCol('done')" aria-expanded="true" aria-controls="kb-cards-done" title="Minimizar coluna" aria-label="Minimizar coluna Concluído">
          <span class="kb-col-chev" aria-hidden="true">▾</span>
          <span class="kb-col-dot" style="background:#4ade80"></span>
          <span class="kb-col-title">Concluído</span>
          <span class="kb-col-cnt" id="kb-cnt-done">0</span>
        </button>
        <button type="button" class="kb-col-add" onclick="openTaskForm('done')" aria-label="Adicionar tarefa em Concluído" title="Nova tarefa">+</button>
      </div>
      <div class="kb-cards" id="kb-cards-done"></div>
    </div>

  </div>

  <!-- Formulário sob demanda (criar / editar uma tarefa por vez) -->
  <div class="tk-modal" id="tk-modal" hidden>
    <div class="tk-modal-bg" onclick="closeTaskForm()"></div>
    <form class="tk-dialog" id="tk-form" role="dialog" aria-modal="true" aria-labelledby="tk-modal-title" novalidate onsubmit="return submitTaskForm(event)">
      <div class="tk-dialog-hd">
        <div>
          <h3 class="tk-dialog-title" id="tk-modal-title">Nova tarefa</h3>
          <div class="tk-dialog-col">Coluna: <strong id="tk-modal-col">A Fazer</strong></div>
        </div>
        <button type="button" class="tk-x" onclick="closeTaskForm()" aria-label="Fechar formulário">✕</button>
      </div>

      <div class="tk-field">
        <label class="tk-label" for="tk-in">Título <span class="tk-req" aria-hidden="true">*</span></label>
        <input class="field" id="tk-in" type="text" maxlength="120" autocomplete="off"
          placeholder="O que precisa ser feito?" required aria-describedby="tk-in-err" oninput="tkSetErr('')" />
        <div class="tk-err" id="tk-in-err" role="alert"></div>
      </div>

      <div class="tk-field">
        <label class="tk-label" for="tk-desc">Descrição <span class="tk-opt">(opcional)</span></label>
        <textarea class="field" id="tk-desc" rows="2" maxlength="300" placeholder="Detalhes, links, observações…"></textarea>
      </div>

      <fieldset class="tk-field tk-fieldset">
        <legend class="tk-label">Importância</legend>
        <div class="tk-seg">
          <label class="tk-seg-opt tk-seg-opt--baixa"><input type="radio" name="tk-pr" value="baixa"><span>▼ Baixa</span></label>
          <label class="tk-seg-opt tk-seg-opt--media"><input type="radio" name="tk-pr" value="media" checked><span>◆ Média</span></label>
          <label class="tk-seg-opt tk-seg-opt--alta"><input type="radio" name="tk-pr" value="alta"><span>▲ Alta</span></label>
        </div>
      </fieldset>

      <div class="tk-row">
        <div class="tk-field">
          <span class="tk-label" id="tk-cat-lbl">Tipo</span>
          <select class="tk-native-select" id="tk-cat" tabindex="-1" aria-hidden="true">
            <option value="geral">📁 Geral</option>
            <option value="estudo">📚 Estudo</option>
            <option value="projeto">🛠 Projeto</option>
            <option value="pessoal">👤 Pessoal</option>
            <option value="urgente">⚡ Urgente</option>
          </select>
          <div class="tk-select-wrap tk-select-wrap--cat">
            <button class="field tk-select-btn" id="tk-cat-btn" type="button" onclick="toggleTaskSelect('tk-cat')" aria-haspopup="listbox" aria-labelledby="tk-cat-lbl tk-cat-label">
              <span id="tk-cat-label"></span><span class="tk-select-chev" aria-hidden="true">⌄</span>
            </button>
            <div class="tk-select-menu" id="tk-cat-menu"></div>
          </div>
        </div>

        <div class="tk-field">
          <span class="tk-label" id="tk-date-lbl">Data</span>
          <div class="date-pick-wrap" id="date-pick-wrap">
            <button type="button" class="date-pick-btn" onclick="toggleDatePick()" aria-haspopup="dialog" aria-labelledby="tk-date-lbl date-pick-label">
              <span id="date-pick-label">Sem data</span>
            </button>
            <div class="date-pick-pop" id="date-pick-pop">
              <div class="dp-header">
                <button type="button" class="dp-nav" onclick="dpChMon(-1)" aria-label="Mês anterior">&#8249;</button>
                <span class="dp-title" id="dp-title"></span>
                <button type="button" class="dp-nav" onclick="dpChMon(1)" aria-label="Próximo mês">&#8250;</button>
              </div>
              <div class="dp-grid" id="dp-grid"></div>
              <div class="dp-footer">
                <button type="button" class="dp-clear" onclick="dpClear()">Sem data</button>
                <button type="button" class="dp-today" onclick="dpToday()">Hoje</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tk-actions">
        <button type="button" class="btn" onclick="closeTaskForm()">Cancelar</button>
        <button type="submit" class="btn pr" id="tk-submit">Criar tarefa</button>
      </div>
    </form>
  </div>

</div>
