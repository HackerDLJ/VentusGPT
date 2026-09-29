(() => {
  const style = document.createElement('style');
  style.textContent = `
    #ventus-ai-launcher{position:fixed;left:22px;bottom:22px;z-index:9999;border:1px solid rgba(126,247,216,.35);background:linear-gradient(135deg,#0b2230,#07131e);color:#eafff9;padding:11px 15px;border-radius:14px;font:600 13px Inter,system-ui;box-shadow:0 14px 45px rgba(0,0,0,.35);cursor:pointer}
    #ventus-ai-studio{position:fixed;left:22px;bottom:76px;z-index:9998;width:520px;max-width:calc(100vw - 44px);height:min(650px,calc(100vh - 105px));display:none;overflow:hidden;border:1px solid rgba(126,247,216,.18);border-radius:24px;background:rgba(5,15,24,.97);color:#e8f4f2;box-shadow:0 30px 100px rgba(0,0,0,.55);font:14px Inter,system-ui}
    #ventus-ai-studio.open{display:flex;flex-direction:column}
    .vas-head{padding:18px 18px 14px;border-bottom:1px solid #17303b;display:flex;align-items:center;justify-content:space-between}.vas-kicker{font-size:10px;letter-spacing:.16em;color:#75e8cf;text-transform:uppercase}.vas-title{font-size:20px;font-weight:750;margin-top:4px}.vas-close{border:0;background:#102532;color:#b9ceca;border-radius:10px;padding:7px 10px;cursor:pointer}
    .vas-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:10px;border-bottom:1px solid #132a35}.vas-tab{border:1px solid transparent;background:#091923;color:#8fa7a7;border-radius:11px;padding:9px 4px;font-size:11px;cursor:pointer}.vas-tab.active{border-color:#286052;background:#102a2d;color:#dffcf5}
    .vas-body{padding:16px;overflow:auto;flex:1}.vas-panel{display:none}.vas-panel.active{display:block}.vas-label{display:block;color:#8fa7a7;font-size:11px;margin:0 0 7px}.vas-input,.vas-textarea,.vas-select{width:100%;box-sizing:border-box;border:1px solid #1c3945;background:#081721;color:#edf8f5;border-radius:12px;padding:11px 12px;outline:none}.vas-textarea{min-height:105px;resize:vertical}.vas-input:focus,.vas-textarea:focus{border-color:#4bbfa8}.vas-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.vas-btn{margin-top:11px;border:0;border-radius:12px;padding:11px 14px;background:#9af2df;color:#06201c;font-weight:750;cursor:pointer}.vas-btn.secondary{background:#102b36;color:#c9e5df}.vas-output{margin-top:13px;padding:13px;border:1px solid #173641;background:#07141e;border-radius:13px;white-space:pre-wrap;line-height:1.55;max-height:270px;overflow:auto}.vas-status{font-size:11px;color:#75908f;margin-top:8px}.vas-image{width:100%;border-radius:14px;margin-top:12px;border:1px solid #1b3944}.vas-drop{border:1px dashed #315462;border-radius:14px;padding:20px;text-align:center;color:#88a5a2;margin-top:8px}.vas-drop input{display:block;width:100%;margin-top:10px}.vas-note{font-size:11px;color:#6f8988;line-height:1.5;margin-top:10px}
    @media(max-width:600px){#ventus-ai-studio{left:10px;bottom:72px;width:calc(100vw - 20px);max-width:none}.vas-tabs{grid-template-columns:repeat(3,1fr)}.vas-row{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.id = 'ventus-ai-launcher';
  launcher.textContent = '✦ AI Studio';
  document.body.appendChild(launcher);

  const studio = document.createElement('section');
  studio.id = 'ventus-ai-studio';
  studio.innerHTML = `
    <div class="vas-head"><div><div class="vas-kicker">VentusGPT / Multimodal Intelligence</div><div class="vas-title">AI Studio</div></div><button class="vas-close" id="vasClose">×</button></div>
    <div class="vas-tabs">
      <button class="vas-tab active" data-tab="research">🔎 Research</button>
      <button class="vas-tab" data-tab="vision">👁 Vision</button>
      <button class="vas-tab" data-tab="calculate">∑ Calculate</button>
      <button class="vas-tab" data-tab="create">✦ Create</button>
      <button class="vas-tab" data-tab="voice">🎙 Live</button>
    </div>
    <div class="vas-body">
      <div class="vas-panel active" id="vas-research"><label class="vas-label">Research question</label><textarea class="vas-textarea" id="vasResearchInput" placeholder="Search the latest official information, weather science, warnings, or any topic..."></textarea><button class="vas-btn" id="vasResearchBtn">Search with grounding</button><div class="vas-status" id="vasResearchStatus"></div><div class="vas-output" id="vasResearchOutput">Grounded results will appear here with source context.</div></div>
      <div class="vas-panel" id="vas-vision"><label class="vas-label">What should VentusGPT inspect?</label><textarea class="vas-textarea" id="vasVisionPrompt" placeholder="Describe the image, identify weather features, read a chart, or explain what you see..."></textarea><div class="vas-drop"><b>Drop an image or choose a file</b><input id="vasVisionFile" type="file" accept="image/*" /></div><button class="vas-btn" id="vasVisionBtn">Analyze image</button><div class="vas-output" id="vasVisionOutput">Image analysis will appear here.</div></div>
      <div class="vas-panel" id="vas-calculate"><label class="vas-label">Expression or physics/math problem</label><textarea class="vas-textarea" id="vasCalcInput" placeholder="Example: (9.81 * 12^2) / 2"></textarea><button class="vas-btn" id="vasCalcBtn">Calculate safely</button><div class="vas-output" id="vasCalcOutput">The calculator never executes arbitrary JavaScript.</div></div>
      <div class="vas-panel" id="vas-create"><label class="vas-label">Image prompt</label><textarea class="vas-textarea" id="vasCreateInput" placeholder="Create a scientific weather visualization, educational diagram, or concept art..."></textarea><div class="vas-row"><div><label class="vas-label">Aspect ratio</label><select class="vas-select" id="vasRatio"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option></select></div></div><button class="vas-btn" id="vasCreateBtn">Generate image</button><div class="vas-output" id="vasCreateOutput">Generated artwork will appear here.</div></div>
      <div class="vas-panel" id="vas-voice"><div class="vas-output">Live Voice is available from the VentusGPT Live interface. This workspace keeps the full real-time microphone/audio pipeline separate so a failed microphone permission does not break the rest of the studio.</div><button class="vas-btn secondary" id="vasVoiceBtn">Open Live Voice</button><div class="vas-note">Voice conversations should clearly distinguish model-derived weather signals from official government warnings.</div></div>
    </div>`;
  document.body.appendChild(studio);

  const $ = (id) => document.getElementById(id);
  const setOutput = (id, text) => { $(id).textContent = text; };
  const request = async (url, body) => { const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Request failed'); return d; };

  launcher.onclick = () => studio.classList.toggle('open');
  $('vasClose').onclick = () => studio.classList.remove('open');
  studio.querySelectorAll('.vas-tab').forEach(tab => tab.onclick = () => { studio.querySelectorAll('.vas-tab').forEach(t=>t.classList.remove('active')); studio.querySelectorAll('.vas-panel').forEach(p=>p.classList.remove('active')); tab.classList.add('active'); $('vas-'+tab.dataset.tab).classList.add('active'); });

  $('vasResearchBtn').onclick = async () => { const q=$('vasResearchInput').value.trim(); if(!q)return; setOutput('vasResearchOutput',''); $('vasResearchStatus').textContent='Grounding with live web sources…'; try{const d=await request('/api/tools/search',{query:q}); setOutput('vasResearchOutput',d.result || 'No result returned.'); $('vasResearchStatus').textContent=d.sources?.length ? `${d.sources.length} grounded source(s) returned.` : 'Answer returned without source metadata.';}catch(e){setOutput('vasResearchOutput','Research failed: '+e.message);$('vasResearchStatus').textContent='';} };

  $('vasVisionBtn').onclick = async () => { const file=$('vasVisionFile').files[0]; if(!file){setOutput('vasVisionOutput','Choose an image first.');return;} setOutput('vasVisionOutput','Analyzing image…'); try{const b64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)}); const d=await request('/api/gemini/analyze',{prompt:$('vasVisionPrompt').value.trim()||'Analyze this image carefully. State uncertainty instead of inventing details.',imageBase64:b64,mimeType:file.type}); setOutput('vasVisionOutput',d.text||'No analysis returned.');}catch(e){setOutput('vasVisionOutput','Vision failed: '+e.message);} };

  $('vasCalcBtn').onclick = async () => { const expression=$('vasCalcInput').value.trim(); if(!expression)return; setOutput('vasCalcOutput','Computing safely…'); try{const d=await request('/api/tools/execute-code',{expression}); setOutput('vasCalcOutput',d.result||'No result returned.');}catch(e){setOutput('vasCalcOutput','Calculation failed: '+e.message);} };

  $('vasCreateBtn').onclick = async () => { const prompt=$('vasCreateInput').value.trim(); if(!prompt)return; setOutput('vasCreateOutput','Generating…'); try{const d=await request('/api/gemini/generate-image',{prompt,aspectRatio:$('vasRatio').value}); const out=$('vasCreateOutput'); out.textContent=d.description||'Generated image'; if(d.imageUrl){const img=document.createElement('img');img.className='vas-image';img.src=d.imageUrl;img.alt='VentusGPT generated image';out.appendChild(img);} }catch(e){setOutput('vasCreateOutput','Generation failed: '+e.message);} };

  $('vasVoiceBtn').onclick = () => { const live=document.querySelector('#ventus-live-launcher,#ventus-live-voice,#liveVoiceLauncher'); if(live) live.click(); else alert('Live Voice is available from the VentusGPT Live control.'); };
})();
