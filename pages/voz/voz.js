// pages\voz\voz.js — NucleaAI (extraído verbatim do source original)
async function falarCambAI(texto) {
  var key     = S.elConfig.key;
  var voiceId = parseInt(S.elConfig.voiceId) || 147320;
  var lang    = S.elConfig.lang || 2;
  var headers = { 'Content-Type': 'application/json', 'x-api-key': key };
  var createRes = await fetch('https://client.camb.ai/apis/tts', {
    method: 'POST', headers: headers,
    body: JSON.stringify({ text: texto, voice_id: voiceId, language: lang })
  });
  if (!createRes.ok) {
    var errBody = {}; try { errBody = await createRes.json(); } catch(e) {}
    throw new Error('camb.ai ' + createRes.status + ': ' + (errBody.message || errBody.detail || 'Verifique sua chave'));
  }
  var createData = await createRes.json();
  var taskId = createData.task_id;
  if (!taskId) throw new Error('camb.ai: task_id não retornado');
  var runId = null;
  for (var t = 0; t < 60; t++) {
    await new Promise(function(r) { setTimeout(r, 2000); });
    var statusRes = await fetch('https://client.camb.ai/apis/tts/' + taskId, { method: 'GET', headers: headers });
    if (!statusRes.ok) throw new Error('camb.ai: falha ao verificar status (' + statusRes.status + ')');
    var statusData = await statusRes.json();
    if (statusData.status === 'SUCCESS') { runId = statusData.run_id; break; }
    else if (statusData.status === 'FAILED') throw new Error('camb.ai: geração de áudio falhou');
  }
  if (!runId) throw new Error('camb.ai: timeout aguardando geração de áudio');
  var audioRes = await fetch('https://client.camb.ai/apis/tts-result/' + runId, { method: 'GET', headers: { 'x-api-key': key } });
  if (!audioRes.ok) throw new Error('camb.ai: falha ao baixar áudio (' + audioRes.status + ')');
  var audioBlob = await audioRes.blob();
  var audioUrl  = URL.createObjectURL(audioBlob);
  var audio     = new Audio();
  return new Promise(function(resolve, reject) {
    audio.oncanplaythrough = function() { VOZ.falando = true; vozUI('falando', 'Respondendo...'); };
    audio.onended = function() { VOZ.falando = false; URL.revokeObjectURL(audioUrl); vozUI('idle', 'Pressione o microfone para falar'); resolve(); };
    audio.onerror = function() { VOZ.falando = false; URL.revokeObjectURL(audioUrl); reject(new Error('Falha ao reproduzir áudio do camb.ai')); };
    audio.src = audioUrl; audio.load(); audio.play().catch(reject);
  });
}
var VOZ = { rec: null, synth: window.speechSynthesis, ouvindo: false, falando: false, pensando: false };

function vozInit() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { vozUI('erro','Seu navegador não suporta voz. Use Chrome ou Edge.'); return false; }
  VOZ.rec = new SR();
  VOZ.rec.lang = 'pt-BR'; VOZ.rec.continuous = false; VOZ.rec.interimResults = true;
  VOZ.rec.onstart  = function() { VOZ.ouvindo = true; vozUI('ouvindo','Ouvindo...'); };
  VOZ.rec.onresult = function(e) {
    var interim = '', final = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final += t) : (interim += t);
    }
    var txt = final || interim;
    document.getElementById('voz-transcript').textContent = txt ? '"' + txt + '"' : '';
    if (final && final.trim()) { VOZ.ouvindo = false; vozResponder(final.trim()); }
  };
  VOZ.rec.onnomatch = function() { vozUI('idle','Não entendi. Tente novamente.'); };
  VOZ.rec.onerror   = function(e) {
    VOZ.ouvindo = false;
    var msgs = { 'no-speech':'Nenhuma fala detectada.', 'not-allowed':'Permissão negada.', 'network':'Erro de rede.' };
    vozUI('idle', msgs[e.error] || 'Erro: ' + e.error);
  };
  VOZ.rec.onend = function() { VOZ.ouvindo = false; if (!VOZ.falando && !VOZ.pensando) vozUI('idle','Pressione o microfone para falar'); };
  return true;
}

function vozToggle() {
  if (VOZ.falando) { VOZ.synth.cancel(); VOZ.falando = false; VOZ.pensando = false; vozUI('idle','Pressione o microfone para falar'); return; }
  if (VOZ.ouvindo) { try { VOZ.rec.stop(); } catch(e) {} VOZ.ouvindo = false; vozUI('idle','Pressione o microfone para falar'); return; }
  if (!VOZ.rec && !vozInit()) return;
  document.getElementById('voz-transcript').textContent = '';
  document.getElementById('voz-response').textContent = '';
  try { VOZ.rec.start(); } catch(e) { VOZ.rec = null; if (vozInit()) try { VOZ.rec.start(); } catch(e2) {} }
}

async function vozResponder(texto) {
  VOZ.pensando = true; vozUI('pensando','Pensando...');
  var c = S.aiConfig;
  var tomMap = { formal:'Use linguagem formal e técnica.', didatico:'Use linguagem clara e didática.', amigavel:'Use linguagem amigável e descontraída.', socratico:'Guie o aluno com uma pergunta de volta.' };
  var idiomaInstr = c.idioma==='en' ? 'Answer in English only.' : c.idioma==='es' ? 'Responde SOLO en español.' : 'Responda SOMENTE em português do Brasil.';
  var prompt = 'Você é ' + c.nome + ', um assistente educacional por voz.\nResponda em 1 ou 2 frases curtas. ' + idiomaInstr + '\n' + (tomMap[c.tom]||tomMap.didatico) + '\n' + (c.extra?'Instrução extra: '+c.extra+'\n':'') + 'IMPORTANTE: Nunca use markdown. Só texto simples.\nPergunta: ' + texto;
  try {
    var resposta = await callAI(prompt);
    var limpo = resposta.replace(/```[\s\S]*?```/g,'').replace(/\{[\s\S]*?\}/g,'').replace(/[*_#`\[\]]/g,'').replace(/"resposta"\s*:\s*"([^"]+)"/i,'$1').trim();
    if (!limpo) limpo = resposta.replace(/[*_#`]/g,'').trim();
    var final = limpo || 'Desculpe, não consegui processar.';
    document.getElementById('voz-response').textContent = final;
    VOZ.pensando = false;
    achVozHook();
    await vozFalar(final);
  } catch(e) { VOZ.pensando = false; vozUI('idle','Erro: '+e.message); showToast(e.message,'err'); }
}

async function vozFalar(texto) {
  if (S.elConfig.motor === 'cambai' && S.elConfig.key) {
    try { await falarCambAI(texto); return; }
    catch(e) { showToast('camb.ai falhou, usando voz do navegador: ' + e.message, 'err'); }
  }
  VOZ.synth.cancel();
  var u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR'; u.rate = 1.0; u.pitch = 1.1;
  var vozes = VOZ.synth.getVoices();
  var voz = null;
  for (var i = 0; i < vozes.length; i++) { if (vozes[i].lang === 'pt-BR') { voz = vozes[i]; break; } }
  if (!voz) for (var i = 0; i < vozes.length; i++) { if (vozes[i].lang.startsWith('pt')) { voz = vozes[i]; break; } }
  if (voz) u.voice = voz;
  u.onstart = function() { VOZ.falando = true; vozUI('falando','Respondendo...'); };
  var onFim = function() { VOZ.falando = false; vozUI('idle','Pressione o microfone para falar'); };
  u.onend = onFim; u.onerror = onFim;
  setTimeout(function() { VOZ.synth.speak(u); }, 80);
}

function vozUI(estado, statusTxt) {
  var status = document.getElementById('voz-status');
  var waves  = document.getElementById('voz-waves');
  var avatar = document.getElementById('voz-avatar');
  var btn    = document.getElementById('voz-mic-btn');
  var lbl    = document.getElementById('voz-mic-label');
  if (status) status.textContent = statusTxt || '';
  ['ouvindo','pensando','falando'].forEach(function(s) {
    if (waves)  waves.classList.remove('voz-waves--'+s);
    if (avatar) avatar.classList.remove('voz-av--'+s);
    if (btn)    btn.classList.remove('voz-btn--'+s);
  });
  if (estado !== 'idle' && estado !== 'erro') {
    if (waves)  waves.classList.add('voz-waves--'+estado);
    if (avatar) avatar.classList.add('voz-av--'+estado);
    if (btn)    btn.classList.add('voz-btn--'+estado);
  }
  applyAvatarVideo(estado === 'idle' || estado === 'erro' ? 'idle' : estado);
  var cfg = { idle:{label:'Falar'}, ouvindo:{label:'Parar'}, pensando:{label:'Aguarde'}, falando:{label:'Parar'}, erro:{label:'Falar'} };
  var cf = cfg[estado] || cfg.idle;
  if (lbl) lbl.textContent = cf.label;
}

function vozStop() {
  if (VOZ.ouvindo) { try { VOZ.rec && VOZ.rec.stop(); } catch(e) {} VOZ.ouvindo = false; }
  if (VOZ.falando) { VOZ.synth.cancel(); VOZ.falando = false; }
  VOZ.pensando = false;
}

