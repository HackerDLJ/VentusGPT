(() => {
  const button = document.createElement('button');
  button.textContent = 'AI Studio';
  button.style.cssText = 'position:fixed;left:20px;bottom:20px;z-index:9999;padding:12px;border-radius:12px;background:#091824;color:white;border:1px solid #234354;cursor:pointer';
  document.body.appendChild(button);
  const panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:fixed;left:20px;bottom:70px;z-index:9998;width:420px;max-width:calc(100vw - 40px);padding:18px;border-radius:18px;background:#06111c;color:white;border:1px solid #234354;box-shadow:0 25px 80px #000';
  panel.innerHTML = '<b>VENTUSGPT AI STUDIO</b><br><br><textarea id="aiPrompt" style="width:100%;height:100px;background:#081a27;color:white"></textarea><br><button id="aiResearch">Research</button><pre id="aiResult"></pre>';
  document.body.appendChild(panel);
  button.onclick = () => panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  panel.querySelector('#aiResearch').onclick = async () => {
    const result = panel.querySelector('#aiResult');
    result.textContent = 'Researching...';
    try {
      const response = await fetch('/api/tools/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: panel.querySelector('#aiPrompt').value }) });
      const data = await response.json();
      result.textContent = data.result || data.error || 'No result';
    } catch (error) { result.textContent = error.message; }
  };
})();