// common\auth.js — NucleaAI (extraído verbatim do source original)
(function() {
 
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCHnPz_bb92UoMBTcjegIGQ_GgY6FluRBk",
  authDomain: "nucleaai-30555.firebaseapp.com",
  projectId: "nucleaai-30555",
  storageBucket: "nucleaai-30555.firebasestorage.app",
  messagingSenderId: "809997459519",
  appId: "1:809997459519:web:392698d2eccfe3380e988a",
  measurementId: "G-HCPBQXEJJ3"
};
 
var _uid       = null;
var _syncTimer = null;
var _patched   = false;
 

function loadScript(src, cb) {
  var s = document.createElement('script');
  s.src = src;
  s.onload = cb;
  s.onerror = function() { console.warn('[NucleaAI] Failed to load:', src); };
  document.head.appendChild(s);
}
 
async function init() {
  firebase.initializeApp(FIREBASE_CONFIG);
  await initAppCheck();
  var auth = firebase.auth();
  var db   = firebase.firestore();
 
  
  function userDoc(col, id) {
    return db.collection('users').doc(_uid).collection(col).doc(id);
  }
 
  function fsSet(col, id, data) {
    if (!_uid) return Promise.resolve();
    return userDoc(col, id).set(data, { merge: true }).catch(function(e) {
      console.warn('[NucleaAI] fsSet:', e);
    });
  }
 
  function fsGet(col, id) {
    if (!_uid) return Promise.resolve(null);
    return userDoc(col, id).get().then(function(snap) {
      return snap.exists ? snap.data() : null;
    }).catch(function() { return null; });
  }
 
  function cloudSave() {
    if (!_uid || typeof S === 'undefined') return;
    setSyncStatus('saving');
 
    var batch = db.batch();
 
    batch.set(userDoc('app','config'), {
      aiConfig:  S.aiConfig  || {},
      fcConfig:  S.fcConfig  || {},
      elConfig:  { motor: (S.elConfig||{}).motor, lang: (S.elConfig||{}).lang },
      username:  localStorage.getItem('fl_username') || 'Usuário',
      theme:     localStorage.getItem('fl_theme')    || 'dark',
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','progress'), {
      prog: S.prog || { total:0, acertos:0, erros:0, temas:{} },
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','tasks'), {
      tasks: S.tasks || [],
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.set(userDoc('app','events'), {
      events: S.events || {},
      updatedAt: Date.now()
    }, { merge: true });
 
    var unlockedArr = [];
    try { unlockedArr = Array.from(ACH_STATE.unlocked); } catch(e) {}
    batch.set(userDoc('app','achievements'), {
      unlocked: unlockedArr,
      vozCount: parseInt(localStorage.getItem('ach_voz_count') || '0'),
      updatedAt: Date.now()
    }, { merge: true });
 
    batch.commit().then(function() {
      // salva chats separado
      return fsSet('app','chats', {
        sessions:  (S.chatSessions || []).slice(0, 30),
        updatedAt: Date.now()
      });
    }).then(function() {
      setSyncStatus('synced');
    }).catch(function(e) {
      console.warn('[NucleaAI] cloudSave:', e);
      setSyncStatus('error');
    });
  }
 
  function debounceSave() {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(cloudSave, 1500);
  }
 
  function cloudLoad() {
    setSyncStatus('saving');
    Promise.all([
      fsGet('app','config'),
      fsGet('app','progress'),
      fsGet('app','tasks'),
      fsGet('app','events'),
      fsGet('app','achievements'),
      fsGet('app','chats'),
    ]).then(function(results) {
      var cfg   = results[0];
      var prog  = results[1];
      var tasks = results[2];
      var evts  = results[3];
      var achs  = results[4];
      var chats = results[5];
 
      if (cfg) {
        if (cfg.aiConfig) Object.assign(S.aiConfig, cfg.aiConfig);
        if (cfg.fcConfig) Object.assign(S.fcConfig, cfg.fcConfig);
        if (cfg.username) localStorage.setItem('fl_username', cfg.username);
        if (cfg.theme) {
          var isLight = cfg.theme === 'light';
          localStorage.setItem('fl_theme', cfg.theme);
          document.body.classList.toggle('light', isLight);
          var sw  = document.getElementById('theme-sw');
          var lbl = document.getElementById('theme-label');
          var bdg = document.getElementById('badge-ap');
          if (sw)  sw.classList.toggle('on', isLight);
          if (lbl) lbl.textContent = isLight ? 'Claro' : 'Escuro';
          if (bdg) bdg.textContent = isLight ? 'Claro' : 'Escuro';
        }
      }
      if (prog  && prog.prog)     S.prog          = prog.prog;
      if (tasks && tasks.tasks)   S.tasks         = tasks.tasks;
      if (evts  && evts.events)   S.events        = evts.events;
      if (chats && chats.sessions) S.chatSessions = chats.sessions;
      if (achs  && achs.unlocked) {
        try {
          ACH_STATE.unlocked = new Set(achs.unlocked);
          localStorage.setItem('fl_ach_unlocked', JSON.stringify(achs.unlocked));
        } catch(e) {}
        if (achs.vozCount) localStorage.setItem('ach_voz_count', String(achs.vozCount));
      }
 
      if (typeof applyAIConfig === 'function') applyAIConfig();
      if (typeof applyFCConfig === 'function') applyFCConfig();
      if (typeof applyELConfig === 'function') applyELConfig();
      if (typeof renderTasks   === 'function') renderTasks();
      if (typeof updBadge      === 'function') updBadge();
      if (typeof renderCal     === 'function') renderCal();
      if (typeof saveLS        === 'function') saveLS();
 
      setSyncStatus('synced');
      showToast('✅ Dados carregados da nuvem!');
    }).catch(function(e) {
      console.warn('[NucleaAI] cloudLoad:', e);
      setSyncStatus('error');
    });
  }
 
  
  function patchSaveLS() {
    if (_patched) return;
    _patched = true;
    var orig = window.saveLS;
    window.saveLS = function() {
      orig();
      if (_uid) debounceSave();
    };
  }
 
 
  function updateAuthUI(user) {
    var lo = document.getElementById('auth-logged-out');
    var li = document.getElementById('auth-logged-in');
    if (!lo || !li) return;
 
    if (user) {
      lo.style.display = 'none';
      li.style.display = 'block';
 
      var name  = user.isAnonymous ? 'Visitante' : (user.displayName || user.email || 'Usuário');
      var first = name.split(' ')[0];
 
      var elName  = document.getElementById('sb-un');
      var elEmail = document.getElementById('sb-email');
      if (elName)  elName.textContent  = first;
      if (elEmail) {
        elEmail.textContent = user.isAnonymous ? 'Conta anônima' : (user.email || '');
        elEmail.style.display = 'block';
      }
 
      var avImg    = document.getElementById('sb-av-img');
      var avLetter = document.getElementById('sb-av-letter');
      if (user.photoURL && avImg) {
        avImg.src = user.photoURL;
        avImg.style.display = 'block';
        if (avLetter) avLetter.style.display = 'none';
      } else if (avLetter) {
        avLetter.textContent = (first[0] || 'U').toUpperCase();
        avLetter.style.display = 'flex';
        if (avImg) avImg.style.display = 'none';
      }
 
      var g = document.getElementById('chat-greeting');
      if (g) {
        var h = new Date().getHours();
        g.textContent = (h<12?'Bom dia':h<18?'Boa tarde':'Boa noite') + ', ' + first + '!';
      }
    } else {
      lo.style.display = 'block';
      li.style.display = 'none';
      setSyncStatus('offline');
    }
  }
 
  function setSyncStatus(status) {
    var dot = document.getElementById('auth-sync-dot');
    var lbl = document.getElementById('auth-sync-label');
    if (!dot || !lbl) return;
    var map = {
      synced:  { c:'#4ade80', t:'Sincronizado'   },
      saving:  { c:'#fbbf24', t:'Salvando...'    },
      offline: { c:'#666',    t:'Offline'         },
      error:   { c:'#f87171', t:'Erro ao salvar'  },
    };
    var s = map[status] || map.offline;
    dot.style.background = s.c;
    lbl.textContent      = s.t;
  }
  window._setSyncStatus = setSyncStatus;
 
  
  var _authMode = 'login';

  function setAuthBusy(busy) {
    document.querySelectorAll('.auth-modal button, .auth-modal input').forEach(function(el) {
      el.disabled = !!busy;
    });
    var status = document.getElementById('auth-modal-status');
    if (status) status.textContent = busy ? 'Aguarde...' : '';
  }

  function setAuthError(msg) {
    var status = document.getElementById('auth-modal-status');
    if (status) status.textContent = msg || '';
  }

  window.openAuthModal = function(mode) {
    _authMode = mode || 'login';
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    setAuthMode(_authMode);
    setAuthError('');
    setTimeout(function() {
      var email = document.getElementById('auth-email');
      if (email) email.focus();
    }, 60);
  };

  window.closeAuthModal = function() {
    var modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    setAuthBusy(false);
  };

  window.setAuthMode = function(mode) {
    _authMode = mode === 'register' ? 'register' : 'login';
    var title = document.getElementById('auth-modal-title');
    var sub = document.getElementById('auth-modal-sub');
    var submit = document.getElementById('auth-email-submit');
    var loginTab = document.getElementById('auth-tab-login');
    var registerTab = document.getElementById('auth-tab-register');
    if (title) title.textContent = _authMode === 'register' ? 'Criar conta' : 'Entrar';
    if (sub) sub.textContent = _authMode === 'register'
      ? 'Crie uma conta para salvar seus dados na nuvem.'
      : 'Escolha como quer acessar sua conta.';
    if (submit) submit.textContent = _authMode === 'register' ? 'Criar conta' : 'Entrar com email';
    if (loginTab) loginTab.classList.toggle('on', _authMode === 'login');
    if (registerTab) registerTab.classList.toggle('on', _authMode === 'register');
    setAuthError('');
  };

  window.authLogin = function() {
    openAuthModal('login');
  };

  window.authGoogle = function() {
    setAuthBusy(true);
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithPopup(provider).then(function() {
      closeAuthModal();
    }).catch(function(e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setAuthError('Erro ao entrar com Google: ' + e.message);
      }
      setAuthBusy(false);
    });
  };

  window.authAnonymous = function() {
    setAuthBusy(true);
    auth.signInAnonymously().then(function() {
      closeAuthModal();
      showToast('Entrou como visitante.');
    }).catch(function(e) {
      setAuthError('Erro ao entrar anonimamente: ' + e.message);
      setAuthBusy(false);
    });
  };

  window.authEmailSubmit = function() {
    var email = (document.getElementById('auth-email') || {}).value || '';
    var pass = (document.getElementById('auth-pass') || {}).value || '';
    email = email.trim();

    if (!email || !pass) {
      setAuthError('Preencha email e senha.');
      return;
    }
    if (pass.length < 6) {
      setAuthError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setAuthBusy(true);
    var action = _authMode === 'register'
      ? auth.createUserWithEmailAndPassword(email, pass)
      : auth.signInWithEmailAndPassword(email, pass);

    action.then(function() {
      closeAuthModal();
      showToast(_authMode === 'register' ? 'Conta criada!' : 'Login realizado!');
    }).catch(function(e) {
      var msg = e.message;
      if (e.code === 'auth/email-already-in-use') msg = 'Este email ja tem uma conta. Use Entrar.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') msg = 'Email ou senha incorretos.';
      if (e.code === 'auth/operation-not-allowed') msg = 'Ative Email/Senha e Anonimo no Firebase Authentication.';
      setAuthError(msg);
      setAuthBusy(false);
    });
  };
 
window.authLogout = function() {
  if (!confirm('Sair da conta? Seus dados ficam salvos na nuvem.')) return;
  auth.signOut().then(function() {
    _uid = null;
    _patched = false;

    // Limpa todos os dados locais ao sair
    var keysToRemove = [
      'fl_chats','fl_tasks','fl_events','fl_prog',
      'fl_aiConfig','fl_fcConfig','fl_elConfig',
      'fl_ach_unlocked','fl_username','fl_theme',
      'ach_voz_count','ach_voz_1','ach_chat_noite'
    ];
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

    // Reseta o estado em memória
    S.chatSessions = []; S.chatHist = []; S.currentSessionId = null;
    S.tasks = []; S.events = {}; S.prog = { total:0, acertos:0, erros:0, temas:{} };
    ACH_STATE.unlocked = new Set();

    // Reseta a UI
    if (typeof resetChatUI === 'function') resetChatUI();
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof renderCal   === 'function') renderCal();

    updateAuthUI(null);
    showToast('Até logo! 👋');
  });
};
 
  
  auth.onAuthStateChanged(function(user) {
    if (user) {
      _uid = user.uid;
 
      // Salva perfil
      userDoc('profile','info').set({
        uid:         user.uid,
        displayName: user.displayName,
        email:       user.email,
        photoURL:    user.photoURL,
        anonymous:   !!user.isAnonymous,
        lastLogin:   Date.now()
      }, { merge: true }).catch(function(){});
 
      updateAuthUI(user);
 
      // Espera S estar pronto
      function tryLoad() {
        if (typeof S !== 'undefined' && typeof saveLS === 'function') {
          cloudLoad();
          patchSaveLS();
        } else {
          setTimeout(tryLoad, 100);
        }
      }
      tryLoad();
    } else {
      _uid = null;
      updateAuthUI(null);
    }
  });
 
}

function initAppCheck() {
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  var siteKey = (cfg.FIREBASE_APP_CHECK_SITE_KEY || '').trim();

  if (!siteKey) {
    console.info('[NucleaAI] App Check aguardando FIREBASE_APP_CHECK_SITE_KEY em config.js.');
    return Promise.resolve();
  }

  if (!firebase.appCheck) {
    console.warn('[NucleaAI] Firebase App Check SDK nao foi carregado.');
    return Promise.resolve();
  }

  try {
    firebase.appCheck().activate(siteKey, true);
    console.info('[NucleaAI] Firebase App Check ativado.');
    if (cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN) {
      console.info('[NucleaAI] App Check debug ligado. Se o token ainda nao apareceu, aguarde esta solicitacao inicial.');
    }
    return firebase.appCheck().getToken(!!cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN).then(function() {
      console.info('[NucleaAI] Token App Check solicitado com sucesso.');
    }).catch(function(e) {
      console.warn('[NucleaAI] Falha ao solicitar token App Check:', e);
    });
  } catch (e) {
    console.warn('[NucleaAI] App Check:', e);
    return Promise.resolve();
  }
}
 

var style = document.createElement('style');
style.textContent = [
  '.auth-google-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:8px;background:var(--sb-new-bg);border:1px solid var(--sb-tog-bd);color:var(--sb-tx-on);font-family:Inter,sans-serif;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;transition:background .18s,transform .15s;margin-bottom:4px;}',
  '.auth-google-btn:hover{background:var(--sb-item-on);transform:translateX(2px);}',
  '.auth-google-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}',
  '.auth-entry-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:8px;background:var(--sb-new-bg);border:1px solid var(--sb-tog-bd);color:var(--sb-tx-on);font-family:Inter,sans-serif;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;transition:background .18s,transform .15s;margin-bottom:4px;}',
  '.auth-entry-btn:hover{background:var(--sb-item-on);transform:translateX(2px);}',
  '.auth-sync-row{display:flex;align-items:center;gap:6px;padding:4px 10px 6px;}',
  '.auth-sync-dot{width:6px;height:6px;border-radius:50%;background:#666;flex-shrink:0;transition:background .3s;}',
  '.auth-sync-label{font-size:10px;color:var(--sb-tx);font-family:Inter,sans-serif;}',
  '#sb-email{margin-top:1px;font-size:10px;color:var(--sb-tx);}',
  '.sb.col .auth-sync-row,.sb.col #sb-email{display:none!important;}',
  '.sb.col .auth-btn-label{display:none!important;}',
  '.auth-modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.62);backdrop-filter:blur(10px);}',
  '.auth-modal.on{display:flex;}',
  '.auth-dialog{width:min(410px,100%);background:#262626;border:1px solid rgba(255,255,255,.10);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.52);padding:22px;color:var(--tx);animation:authIn .18s ease-out;}',
  '@keyframes authIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
  '.auth-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;}',
  '.auth-title{font-size:21px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:0;}',
  '.auth-sub{font-size:12px;color:#9a9a9a;margin-top:5px;line-height:1.45;}',
  '.auth-close{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:#1f1f1f;color:#d8d8d8;cursor:pointer;font-size:18px;transition:background .15s,color .15s;}',
  '.auth-close:hover{background:#2f2f2f;color:#fff;}',
  '.auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid rgba(255,255,255,.07);background:#1b1b1b;border-radius:10px;margin-bottom:14px;}',
  '.auth-tab{border:0;border-radius:8px;background:transparent;color:#999;font-weight:800;font-size:12px;padding:10px;cursor:pointer;transition:background .15s,color .15s;}',
  '.auth-tab.on{background:#d4b84a;color:#1a1200;}',
  '.auth-form{display:flex;flex-direction:column;gap:10px;}',
  '.auth-field{width:100%;border:1px solid rgba(255,255,255,.08);background:#1c1c1c;color:#fff;border-radius:10px;padding:13px 14px;font:600 13px Inter,sans-serif;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;}',
  '.auth-field::placeholder{color:#777;}',
  '.auth-field:focus{border-color:#d4b84a;box-shadow:0 0 0 3px rgba(212,184,74,.14);background:#1a1a1a;}',
  '.auth-primary{border:0;border-radius:10px;background:#d4b84a;color:#1a1200;font-weight:900;padding:12px;cursor:pointer;transition:filter .15s,transform .12s;}',
  '.auth-primary:hover{filter:brightness(1.05);}',
  '.auth-primary:active{transform:translateY(1px);}',
  '.auth-provider{border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#202020;color:#fff;font-weight:850;padding:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:background .15s,border-color .15s;}',
  '.auth-provider:hover{background:#242424;border-color:rgba(255,255,255,.14);}',
  '.auth-anon{border:1px solid rgba(255,255,255,.08);border-radius:10px;background:transparent;color:#b5b5b5;font-weight:850;padding:12px;cursor:pointer;transition:background .15s,color .15s,border-color .15s;}',
  '.auth-anon:hover{background:#202020;color:#fff;border-color:rgba(255,255,255,.14);}',
  '.auth-sep{display:flex;align-items:center;gap:10px;color:#777;font-size:11px;margin:7px 0 5px;}',
  '.auth-sep:before,.auth-sep:after{content:"";height:1px;background:var(--bd);flex:1;}',
  '.auth-status{min-height:18px;color:#f87171;font-size:11px;line-height:1.4;margin-top:8px;}',
  '.auth-modal button:disabled,.auth-modal input:disabled{opacity:.6;cursor:not-allowed;}'
].join('');
document.head.appendChild(style);
 

var sbBot = document.querySelector('.sb-bot');
if (sbBot) {
  sbBot.innerHTML = [
    '<button class="nav-i" id="n-config" onclick="go(\'config\',this)">',
      '<span class="nav-ic"><img src="icons/setting (1).png" class="ic16" alt="" onerror="this.replaceWith(document.createTextNode(\'⚙\'))"/></span>',
      '<span class="nav-lb">Configurações</span>',
    '</button>',
    '<div class="sb-div"></div>',
 
    // NÃO logado
    '<div id="auth-logged-out">',
      '<button class="auth-entry-btn" id="btn-auth-open" onclick="openAuthModal(\'login\')">',
        '<span class="nav-ic"><img src="icons/user.png" class="ic16" alt="" onerror="this.replaceWith(document.createTextNode(\'👤\'))"/></span>',
        '<span class="auth-btn-label">Entrar ou continuar</span>',
      '</button>',
    '</div>',
 
    // Logado
    '<div id="auth-logged-in" style="display:none">',
      '<div class="sb-user">',
        '<div class="sb-av" id="sb-av" style="overflow:hidden;padding:0">',
          '<img id="sb-av-img" src="" alt="" style="width:100%;height:100%;border-radius:50%;display:none;object-fit:cover"/>',
          '<span id="sb-av-letter" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%">U</span>',
        '</div>',
        '<div style="flex:1;min-width:0;overflow:hidden">',
          '<div class="sb-un" id="sb-un">Usuário</div>',
          '<div id="sb-email" style="display:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>',
        '</div>',
      '</div>',
      '<div class="auth-sync-row">',
        '<div class="auth-sync-dot" id="auth-sync-dot"></div>',
        '<span class="auth-sync-label" id="auth-sync-label">Offline</span>',
      '</div>',
      '<button class="nav-i" onclick="authLogout()">',
        '<span class="nav-ic"><img src="icons/exit.png" class="ic16" alt="" onerror="this.replaceWith(document.createTextNode(\'↪\'))"/></span>',
        '<span class="nav-lb">Sair da conta</span>',
      '</button>',
    '</div>'
  ].join('');
}

if (!document.getElementById('auth-modal')) {
  document.body.insertAdjacentHTML('beforeend', [
    '<div class="auth-modal" id="auth-modal" aria-hidden="true" onclick="if(event.target===this) closeAuthModal()">',
      '<div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">',
        '<div class="auth-head">',
          '<div>',
            '<div class="auth-title" id="auth-modal-title">Entrar</div>',
            '<div class="auth-sub" id="auth-modal-sub">Escolha como quer acessar sua conta.</div>',
          '</div>',
          '<button class="auth-close" type="button" onclick="closeAuthModal()" aria-label="Fechar">×</button>',
        '</div>',
        '<div class="auth-tabs">',
          '<button class="auth-tab on" id="auth-tab-login" type="button" onclick="setAuthMode(\'login\')">Entrar</button>',
          '<button class="auth-tab" id="auth-tab-register" type="button" onclick="setAuthMode(\'register\')">Criar conta</button>',
        '</div>',
        '<div class="auth-form">',
          '<input class="auth-field" id="auth-email" type="email" autocomplete="email" placeholder="Email">',
          '<input class="auth-field" id="auth-pass" type="password" autocomplete="current-password" placeholder="Senha">',
          '<button class="auth-primary" id="auth-email-submit" type="button" onclick="authEmailSubmit()">Entrar com email</button>',
          '<div class="auth-sep">ou</div>',
          '<button class="auth-provider" type="button" onclick="authGoogle()">',
            '<svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">',
              '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13.2 17.9 9.5 24 9.5z"/>',
              '<path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.2-9.4 6.2-16.3z"/>',
              '<path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.8 10.7l7.9-6.1z"/>',
              '<path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2 1.4-4.6 2.2-8.2 2.2-6.1 0-11.4-3.7-13.3-9l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>',
            '</svg>',
            'Entrar com Google',
          '</button>',
          '<button class="auth-anon" type="button" onclick="authAnonymous()">Continuar anônimo</button>',
        '</div>',
        '<div class="auth-status" id="auth-modal-status"></div>',
      '</div>',
    '</div>'
  ].join(''));
}
 
function loadScript(src, cb) {
  var s = document.createElement('script');
  s.src = src; s.onload = cb;
  document.head.appendChild(s);
}
 
function prepareAppCheckDebugToken() {
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
  if (!cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN) return;
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN === true
    ? true
    : String(cfg.FIREBASE_APP_CHECK_DEBUG_TOKEN);
  console.info('[NucleaAI] App Check debug preparado antes de carregar o SDK.');
}

prepareAppCheckDebugToken();

var FIREBASE_SDK_BASE = 'https://www.gstatic.com/firebasejs/9.23.0/';
loadScript(FIREBASE_SDK_BASE + 'firebase-app-compat.js', function() {
  loadScript(FIREBASE_SDK_BASE + 'firebase-app-check-compat.js', function() {
    loadScript(FIREBASE_SDK_BASE + 'firebase-auth-compat.js', function() {
      loadScript(FIREBASE_SDK_BASE + 'firebase-firestore-compat.js', function() {
        init();
      });
    });
  });
});
 
})(); 

