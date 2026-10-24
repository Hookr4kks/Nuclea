<!-- TAREFAS -->
<div class="panel panel-tarefas" id="p-tarefas">
  <div class="kb-add-bar">
    <input class="field kb-add-input" id="tk-in"
      placeholder="Nova tarefa... (Enter para adicionar)"
      onkeydown="if(event.key==='Enter') addTask()"/>
    <select class="field tk-native-select" id="tk-pr">
      <option value="alta">🔴 Alta</option>
      <option value="media" selected>🟡 Média</option>
      <option value="baixa">🟢 Baixa</option>
    </select>
    <div class="tk-select-wrap">
      <button class="field tk-select-btn" id="tk-pr-btn" type="button" onclick="toggleTaskSelect('tk-pr')">
        <span id="tk-pr-label"></span><span class="tk-select-chev">⌄</span>
      </button>
      <div class="tk-select-menu" id="tk-pr-menu"></div>
    </div>
    <select class="field tk-native-select" id="tk-cat">
      <option value="geral">📁 Geral</option>
      <option value="estudo">📚 Estudo</option>
      <option value="projeto">🛠 Projeto</option>
      <option value="pessoal">👤 Pessoal</option>
      <option value="urgente">⚡ Urgente</option>
    </select>
    <div class="tk-select-wrap tk-select-wrap--cat">
      <button class="field tk-select-btn" id="tk-cat-btn" type="button" onclick="toggleTaskSelect('tk-cat')">
        <span id="tk-cat-label"></span><span class="tk-select-chev">⌄</span>
      </button>
      <div class="tk-select-menu" id="tk-cat-menu"></div>
    </div>
    <div class="date-pick-wrap" id="date-pick-wrap">
      <button class="date-pick-btn" onclick="toggleDatePick()">
        <span id="date-pick-label">📅 Data</span>
      </button>
      <div class="date-pick-pop" id="date-pick-pop">
        <div class="dp-header">
          <button class="dp-nav" onclick="dpChMon(-1)">&#8249;</button>
          <span class="dp-title" id="dp-title"></span>
          <button class="dp-nav" onclick="dpChMon(1)">&#8250;</button>
        </div>
        <div class="dp-grid" id="dp-grid"></div>
        <div class="dp-footer">
          <button class="dp-clear" onclick="dpClear()">Sem data</button>
          <button class="dp-today" onclick="dpToday()">Hoje</button>
        </div>
      </div>
    </div>
    <button class="btn pr" onclick="addTask()" style="flex-shrink:0">+ Adicionar</button>
  </div>
  <div class="kb-progress-bar-wrap" id="kb-progress-wrap">
    <div class="kb-progress-bar" id="kb-progress-fill"></div>
    <span class="kb-progress-label" id="kb-progress-label">0 concluídas</span>
  </div>
  <div class="kb-board">
    <div class="kb-col" id="kb-col-todo" ondragover="event.preventDefault()" ondrop="dropTask(event,'todo')">
      <div class="kb-col-hd">
        <div class="kb-col-dot" style="background:#6c8ef5"></div>
        <span class="kb-col-title">A Fazer</span>
        <span class="kb-col-cnt" id="kb-cnt-todo">0</span>
      </div>
      <div class="kb-cards" id="kb-cards-todo"></div>
    </div>
    <div class="kb-col" id="kb-col-doing" ondragover="event.preventDefault()" ondrop="dropTask(event,'doing')">
      <div class="kb-col-hd">
        <div class="kb-col-dot" style="background:#fbbf24"></div>
        <span class="kb-col-title">Em Progresso</span>
        <span class="kb-col-cnt" id="kb-cnt-doing">0</span>
      </div>
      <div class="kb-cards" id="kb-cards-doing"></div>
    </div>
    <div class="kb-col" id="kb-col-done" ondragover="event.preventDefault()" ondrop="dropTask(event,'done')">
      <div class="kb-col-hd">
        <div class="kb-col-dot" style="background:#4ade80"></div>
        <span class="kb-col-title">Concluído</span>
        <span class="kb-col-cnt" id="kb-cnt-done">0</span>
      </div>
      <div class="kb-cards" id="kb-cards-done"></div>
    </div>
  </div>
</div>
