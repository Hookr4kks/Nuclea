// common/page-loader.js — injeta os fragmentos HTML de cada página dentro de .content
(function() {
  var PAGES = [
    'chat', 'historico', 'agenda', 'tarefas', 'flashcards',
    'progresso', 'voz', 'conquistas', 'config'
  ];
  var content = document.querySelector('.content');

  function load(i, cb) {
    if (i >= PAGES.length) { if (cb) cb(); return; }
    var name = PAGES[i];
    fetch('pages/' + name + '/' + name + '.html')
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(html) {
        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        while (wrap.firstChild) content.appendChild(wrap.firstChild);
        load(i + 1, cb);
      })
      .catch(function(e) {
        console.warn('page-loader: falha ao carregar ' + name, e);
        load(i + 1, cb);
      });
  }

  load(0, function() {
    try { if (window.runBoot) window.runBoot(); } catch (e) { console.error(e); }
    window.dispatchEvent(new Event('nucleai:pages-loaded'));
  });
})();
