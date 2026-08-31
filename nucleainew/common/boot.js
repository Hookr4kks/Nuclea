// common\boot.js — NucleaAI (extraído verbatim do source original)
// Inicializa após a injeção dos fragmentos de página (chamado por common/page-loader.js).
window.runBoot = function() {
(function boot() {
  loadLS();
  initPins();
  renderCal();
  initTaskSelects();
  initCfgSelects();
  renderTasks();
  applyAIConfig();
  applyFCConfig();
  applyELConfig();
  checkAchievements();
  applyAvatarVideo('idle');

  var apiKeyEl = document.getElementById('api-key');
  var mdlSelEl = document.getElementById('mdl-sel');
  var apiBadgeEl = document.getElementById('badge-api');
  if (S.apiKey && apiKeyEl) apiKeyEl.value = S.apiKey;
  if (S.model && mdlSelEl) mdlSelEl.value = S.model;
  if (apiBadgeEl) apiBadgeEl.textContent = S.apiKey ? 'Chave local' : 'Backend Vercel';
  syncCfgSelect('mdl-sel');

  var h = new Date().getHours();
  var saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var nm = localStorage.getItem('fl_username') || 'Usuário';
  document.getElementById('sb-un').textContent = nm;
  document.getElementById('sb-av').textContent = nm[0].toUpperCase();
  var usrNm = document.getElementById('usr-nm'); if (usrNm) usrNm.value = nm;
  var g = document.getElementById('chat-greeting'); if (g) g.textContent = saud + ', ' + nm + '!';

  if (localStorage.getItem('fl_theme') === 'light') {
    document.body.classList.add('light');
    var sw = document.getElementById('theme-sw'), lbl = document.getElementById('theme-label');
    if (sw) sw.classList.add('on');
    if (lbl) lbl.textContent = 'Claro';
    applyAvatarVideo('idle');
  }

  var badge = document.getElementById('badge-ap');
  if (badge) badge.textContent = document.body.classList.contains('light') ? 'Claro' : 'Escuro';
})();

var usrNmEl = document.getElementById('usr-nm');
if (usrNmEl) {
  usrNmEl.addEventListener('change', function() {
    localStorage.setItem('fl_username', this.value.trim());
  });
}
};

