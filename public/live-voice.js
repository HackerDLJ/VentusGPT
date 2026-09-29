(() => {
  const style = document.createElement('style');
  style.textContent = `
    #ventus-live-launcher{position:fixed;right:22px;bottom:22px;z-index:9999;border:1px solid rgba(125,211,252,.28);background:linear-gradient(135deg,#0b1724,#102a35);color:#e8fbff;border-radius:999px;padding:12px 17px;display:flex;gap:9px;align-items:center;font:600 13px/1 system-ui,sans-serif;box-shadow:0 18px 55px rgba(0,0,0,.35);cursor:pointer;backdrop-filter:blur(18px)}
    #ventus-live-launcher .dot{width:8px;height:8px;border-radius:50%;background:#6ee7b7;box-shadow:0 0 12px #6ee7b7}
    #ventus-live-panel{position:fixed;right:22px;bottom:78px;width:min(390px,calc(100vw - 28px));z-index:10000;display:none;color:#e9faff;background:rgba(5,13,23,.96);border:1px solid rgba(125,211,252,.18);border-radius:24px;box-shadow:0 28px 90px rgba(0,0,0,.55);backdrop-filter:blur(24px);overflow:hidden;font:14px/1.45 system-ui,sans-serif}
    #ventus-live-panel.open{display:block}
    .vl-head{padding:18px 18px 14px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.08)}
    .vl-brand{display:flex;gap:10px;align-items:center}.vl-mark{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#7dd3fc,#5eead4);display:grid;place-items:center;color:#06111c;font-weight:900}.vl-kicker{font-size:10px;letter-spacing:.14em;color:#8aa8b4}.vl-title{font-size:18px;font-weight:750}.vl-close{border:0;background:transparent;color:#8aa8b4;font-size:20px;cursor:pointer}
    .vl-body{padding:16px}.vl-status{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.vl-status b{font-size:12px}.vl-state{color:#7dd3fc}.vl-location{width:100%;box-sizing:border-box;background:#0a1824;border:1px solid rgba(255,255,255,.1);color:#e9faff;border-radius:12px;padding:11px 12px;outline:none}.vl-orb{height:145px;margin:14px 0;border:1px solid rgba(125,211,252,.12);border-radius:20px;background:radial-gradient(circle at 50% 45%,rgba(94,234,212,.17),transparent 48%),#07121e;display:grid;place-items:center}.vl-orb-core{width:70px;height:70px;border-radius:50%;border:1px solid rgba(125,211,252,.45);box-shadow:0 0 40px rgba(94,234,212,.22);display:grid;place-items:center;font-size:27px;transition:.2s}.vl-orb-core.active{transform:scale(1.12);box-shadow:0 0 65px rgba(94,234,212,.5)}.vl-caption{min-height:70px;color:#b9d0d8;font-size:13px;background:#081620;border-radius:14px;padding:12px;white-space:pre-wrap}.vl-actions{display:flex;gap:8px;margin-top:12px}.vl-actions button{flex:1;border:1px solid rgba(255,255,255,.1);background:#0b1d2a;color:#e9faff;border-radius:12px;padding:11px;cursor:pointer;font-weight:650}.vl-actions .primary{background:linear-gradient(135deg,#78e3d2,#69c9ed);color:#04131b;border:0}.vl-actions button:disabled{opacity:.45;cursor:not-allowed}.vl-note{font-size:10px;color:#6f8993;margin-top:10px}
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.id = 'ventus-live-launcher';
  launcher.innerHTML = '<span class="dot"></span><span>Live Voice</span>';
  document.body.appendChild(launcher);

  const panel = document.createElement('section');
  panel.id = 'ventus-live-panel';
  panel.innerHTML = `
    <div class="vl-head"><div class="vl-brand"><div class="vl-mark">V</div><div><div class="vl-kicker">VENTUSGPT / LIVE</div><div class="vl-title">Talk to the atmosphere</div></div></div><button class="vl-close" aria-label="Close">×</button></div>
    <div class="vl-body"><div class="vl-status"><b class="vl-state">READY</b><span>Gemini Live</span></div><input class="vl-location" value="Chennai" aria-label="Location" placeholder="Location"/><div class="vl-orb"><div class="vl-orb-core">◉</div></div><div class="vl-caption">Press Start and speak naturally. Ask about weather, alerts, travel, farming or climate.</div><div class="vl-actions"><button class="primary" id="vl-start">Start conversation</button><button id="vl-stop" disabled>End</button></div><div class="vl-note">Voice is sent to the VentusGPT Live session. Official warnings remain distinct from model signals.</div></div>`;
  document.body.appendChild(panel);

  const state = { sessionId:null, es:null, inputCtx:null, outputCtx:null, stream:null, processor:null, nextStart:0, active:false, muted:false };
  const $ = (s) => panel.querySelector(s);
  const status = $('.vl-state'), caption = $('.vl-caption'), core = $('.vl-orb-core'), startBtn = $('#vl-start'), stopBtn = $('#vl-stop'), locationInput = $('.vl-location');

  const setStatus = (text) => status.textContent = text;
  const setCaption = (text) => { caption.textContent = text; };

  async function ensureOutput(){
    const C = window.AudioContext || window.webkitAudioContext;
    if(!state.outputCtx) state.outputCtx = new C({sampleRate:24000});
    if(state.outputCtx.state==='suspended') await state.outputCtx.resume();
  }
  function playPcm(base64){
    if(!state.outputCtx) return;
    try{
      const bin=atob(base64), bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      const pcm=new Int16Array(bytes.buffer), f=new Float32Array(pcm.length); for(let i=0;i<pcm.length;i++) f[i]=pcm[i]/32768;
      const b=state.outputCtx.createBuffer(1,f.length,24000); b.getChannelData(0).set(f);
      const src=state.outputCtx.createBufferSource(); src.buffer=b; src.connect(state.outputCtx.destination);
      const now=state.outputCtx.currentTime; if(state.nextStart<now) state.nextStart=now+.03; src.start(state.nextStart); state.nextStart+=b.duration;
    }catch(e){console.warn('Ventus voice playback',e)}
  }
  async function sendAudio(base64){
    if(!state.sessionId || !state.active) return;
    try{ await fetch(`/api/live/session/${state.sessionId}/input`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'audio',audio:base64})}); }catch(e){}
  }
  function startMic(){
    const C=window.AudioContext||window.webkitAudioContext;
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}}).then(async stream=>{
      state.stream=stream; state.inputCtx=new C({sampleRate:16000}); if(state.inputCtx.state==='suspended') await state.inputCtx.resume();
      const source=state.inputCtx.createMediaStreamSource(stream); state.processor=state.inputCtx.createScriptProcessor(2048,1,1);
      state.processor.onaudioprocess=e=>{ if(!state.active)return; const data=e.inputBuffer.getChannelData(0), pcm=new Int16Array(data.length); let sum=0; for(let i=0;i<data.length;i++){const s=Math.max(-1,Math.min(1,data[i]));pcm[i]=s<0?s*32768:s*32767;sum+=s*s;} core.classList.toggle('active',Math.sqrt(sum/data.length)*6>.08); const bytes=new Uint8Array(pcm.buffer), bin=[]; for(let i=0;i<bytes.length;i++)bin.push(String.fromCharCode(bytes[i])); sendAudio(btoa(bin.join(''))); };
      source.connect(state.processor); state.processor.connect(state.inputCtx.destination);
    });
  }
  async function start(){
    if(state.active)return; startBtn.disabled=true; setStatus('CONNECTING…'); setCaption('Opening a secure live conversation…');
    try{
      await ensureOutput();
      const r=await fetch('/api/live/session/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.1-flash-live-preview',voice:'Zephyr',targetLanguageCode:'en',systemInstruction:`You are VentusGPT Live, a concise multimodal weather intelligence assistant. The user is in ${locationInput.value||'Chennai'}. Maintain conversational context. Use weather tools when needed. Never present model-derived risk as an official warning. If official warnings are unavailable, say so.`})});
      const d=await r.json(); if(!r.ok) throw Error(d.error||'Live session failed'); state.sessionId=d.sessionId; state.active=true;
      state.es=new EventSource(`/api/live/session/${state.sessionId}/events`);
      state.es.onmessage=e=>{if(!e.data)return; try{const m=JSON.parse(e.data); if(m.type==='ready'){setStatus('LIVE');setCaption('Listening… ask me anything about the weather.');} if(m.type==='audio'&&m.audio)playPcm(m.audio); if(m.type==='model_text'&&m.text)setCaption(m.text); if(m.type==='caption'&&m.text)setCaption(m.text); if(m.type==='user_transcription'&&m.text)setCaption('You: '+m.text); if(m.type==='interrupted')setStatus('INTERRUPTED'); if(m.type==='session_error'){setStatus('ERROR');setCaption(m.error||'Live session error');stop();} if(m.type==='session_closed')stop();}catch(err){console.warn(err)}};
      state.es.onerror=()=>{ if(state.active){setStatus('RECONNECTING…');} };
      await startMic(); stopBtn.disabled=false; startBtn.textContent='Live';
    }catch(e){setStatus('ERROR');setCaption(e.message||'Microphone or Live API unavailable.');startBtn.disabled=false;state.active=false;}
  }
  function stop(){
    state.active=false; if(state.es){state.es.close();state.es=null;} if(state.processor){state.processor.disconnect();state.processor=null;} if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;} if(state.inputCtx){state.inputCtx.close().catch(()=>{});state.inputCtx=null;} state.sessionId=null; core.classList.remove('active'); setStatus('READY'); startBtn.disabled=false; startBtn.textContent='Start conversation'; stopBtn.disabled=true;
  }
  launcher.onclick=()=>panel.classList.toggle('open'); $('.vl-close').onclick=()=>{stop();panel.classList.remove('open')}; startBtn.onclick=start; stopBtn.onclick=stop; window.addEventListener('beforeunload',stop);
})();
