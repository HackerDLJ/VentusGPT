import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Bot, Calculator, CloudRain, Compass, ExternalLink, Image as ImageIcon, Leaf, Loader2, MapPin, Menu, Mic, Search, Send, ShieldAlert, Sparkles, Thermometer, Volume2, Wind, X } from "lucide-react";

type Weather = any;
type Message = { role: "user" | "assistant"; text: string; sources?: { title: string; uri: string }[] };

type Page = "overview" | "chat" | "alerts" | "farmer" | "climate" | "nwp" | "studio";

const nav: { id: Page; label: string; icon: any }[] = [
  { id: "overview", label: "Command Center", icon: Compass },
  { id: "chat", label: "Ask VentusGPT", icon: Bot },
  { id: "alerts", label: "Alert Center", icon: ShieldAlert },
  { id: "farmer", label: "Farmer Mode", icon: Leaf },
  { id: "climate", label: "Climate Explorer", icon: BarChart3 },
  { id: "nwp", label: "NWP Lab", icon: Activity },
  { id: "studio", label: "AI Studio", icon: Sparkles },
];

const quickQuestions = [
  "Will it rain today?",
  "Can I travel tomorrow?",
  "Is it safe to spray pesticide?",
  "Explain today's weather risk",
];

async function jsonFetch(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
  return body;
}

function fmtDay(date: string, i: number) {
  if (i === 0) return "TODAY";
  return new Date(date).toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
}

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [location, setLocation] = useState("Chennai");
  const [locationInput, setLocationInput] = useState("Chennai");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [studioTool, setStudioTool] = useState("Research");
  const [studioInput, setStudioInput] = useState("");
  const [studioResult, setStudioResult] = useState("");

  const loadWeather = async (place = location) => {
    setLoading(true); setError("");
    try { setWeather(await jsonFetch(`/api/weather/forecast?location=${encodeURIComponent(place)}`)); }
    catch (e: any) { setError(e.message || "Weather service unavailable"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadWeather(); }, []);

  const ask = async (text = input) => {
    const q = text.trim(); if (!q || thinking) return;
    const next = [...messages, { role: "user", text: q } as Message];
    setMessages(next); setInput(""); setThinking(true); setPage("chat"); setError("");
    try {
      const out = await jsonFetch("/api/gemini/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, history: next, location, language: "auto" }) });
      setWeather(out.weather || weather); setMessages([...next, { role: "assistant", text: out.text, sources: out.sources }]);
    } catch (e: any) { setMessages([...next, { role: "assistant", text: `I couldn't reach the intelligence layer: ${e.message}` }]); }
    finally { setThinking(false); }
  };

  const changeLocation = async () => {
    const value = locationInput.trim(); if (!value) return;
    setLocation(value); await loadWeather(value);
  };

  const alert = weather?.alert;
  const current = weather?.current;
  const days = weather?.daily || [];
  const riskClass = alert?.severity === "WARNING" || alert?.severity === "OFFICIAL" ? "danger" : alert?.severity === "WATCH" ? "official-risk" : "";

  const runStudio = async () => {
    const q = studioInput.trim(); if (!q) return;
    setStudioResult("");
    try {
      if (studioTool === "Research") {
        const out = await jsonFetch("/api/tools/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
        setStudioResult(out.result || "No result.");
      } else if (studioTool === "Calculate") {
        const out = await jsonFetch("/api/tools/execute-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expression: q }) });
        setStudioResult(out.result || "No result.");
      } else {
        setStudioResult(`${studioTool} is connected to the VentusGPT multimodal backend. Use the conversation workspace for contextual weather reasoning, or provide the required input here.`);
      }
    } catch (e: any) { setStudioResult(e.message || "Tool failed"); }
  };

  const content = useMemo(() => {
    if (page === "chat") return <ChatView messages={messages} input={input} setInput={setInput} ask={ask} thinking={thinking} location={location} />;
    if (page === "alerts") return <AlertsView weather={weather} />;
    if (page === "farmer") return <FarmerView location={location} />;
    if (page === "climate") return <ClimateView location={location} />;
    if (page === "nwp") return <NwpView location={location} />;
    if (page === "studio") return <StudioView tool={studioTool} setTool={setStudioTool} input={studioInput} setInput={setStudioInput} result={studioResult} run={runStudio} />;
    return <Overview weather={weather} loading={loading} riskClass={riskClass} ask={ask} location={location} />;
  }, [page, weather, loading, messages, input, thinking, location, studioTool, studioInput, studioResult]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation">{mobileNav ? <X /> : <Menu />}</button>
        <div className="brand"><img src="/favicon.svg" alt="VentusGPT" /><div><b>Ventus<span>GPT</span></b><small>WEATHER INTELLIGENCE</small></div></div>
        <div className="location"><MapPin size={14}/><input value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => e.key === "Enter" && changeLocation()} placeholder="Search a city or district"/><button onClick={changeLocation}><Search size={15}/></button></div>
        <div className="top-actions"><span className="live"><i/> LIVE DATA</span><button onClick={() => loadWeather()} aria-label="Refresh weather"><Activity size={17}/></button></div>
      </header>
      <div className="shell">
        <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
          <div className="nav-title">VENTUS INTELLIGENCE</div>
          <nav className="nav-list">{nav.map(n => { const I = n.icon; return <button key={n.id} className={`nav ${page === n.id ? "active" : ""}`} onClick={() => { setPage(n.id); setMobileNav(false); }}><I/><span>{n.label}</span></button>; })}</nav>
          <div className="sidebar-status"><div><span className="status-dot"/> SYSTEM ONLINE</div><small>Forecast · AI · NWP routing active</small></div>
          <div className="sidebar-bottom"><img src="/branding/ventus-wordmark.svg" alt="VentusGPT"/><span>Conversational weather intelligence for citizens, farmers and disaster awareness.</span><em>SIH26068 · v2.0</em></div>
        </aside>
        <main className="main">{error && <div className="error"><AlertTriangle size={15}/>{error}<button onClick={() => setError("")}><X size={14}/></button></div>}{content}</main>
      </div>
    </div>
  );
}

function Overview({ weather, loading, riskClass, ask, location }: any) {
  const c = weather?.current; const days = weather?.daily || []; const alert = weather?.alert;
  if (loading && !weather) return <div className="page"><div className="panel" style={{padding:40,textAlign:"center"}}><Loader2 className="spin"/> Loading weather intelligence…</div></div>;
  return <div className="page">
    <div className="page-intro"><div><div className="eyebrow">COMMAND CENTER / {weather?.location || location}</div><h1>Know the sky.<br/><span>Make the decision.</span></h1><p>One conversational layer across live conditions, forecasts, numerical models, official warnings and practical weather decisions.</p></div><button className="outline" onClick={() => ask("Explain the most important weather decision for me today")}>Ask VentusGPT <Sparkles size={13}/></button></div>
    <div className="signal-strip"><div><span className="signal-live"/><b>LIVE</b><span>{weather?.provider?.name || "Weather provider"}</span></div><div className={alert?.official ? "official" : "model"}><AlertTriangle size={13}/><b>{alert?.official ? "OFFICIAL" : "MODEL"}</b><span>{alert?.title || "No elevated risk"}</span></div><div><b>MODEL</b><span>{weather?.provider?.model || "NWP"}</span></div><div><b>UPDATED</b><span>{weather?.provider?.updatedAt ? new Date(weather.provider.updatedAt).toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"}) : "now"}</span></div></div>
    <div className="hero-grid"><section className="panel hero"><div className="eyebrow"><i/> CURRENT CONDITIONS</div><div className="hero-main"><div><div className="temp">{Math.round(c?.temperature ?? 0)}°</div><h2>{c?.condition || "Loading"}</h2><p>Feels like {Math.round(c?.feelsLike ?? 0)}° · {weather?.location}</p></div><div className="hero-mark"><CloudRain size={55}/><span>ATMOSPHERE</span></div></div><div className="metrics"><Metric icon={<Thermometer/>} label="FEELS LIKE" value={`${Math.round(c?.feelsLike ?? 0)}°C`}/><Metric icon={<CloudRain/>} label="HUMIDITY" value={`${c?.humidity ?? "—"}%`}/><Metric icon={<Wind/>} label="WIND" value={`${Math.round(c?.windSpeed ?? 0)} km/h`}/><Metric icon={<Activity/>} label="PRESSURE" value={`${Math.round(c?.pressure ?? 0)} hPa`}/></div></section><section className={`panel risk ${riskClass}`}><div className="risk-label"><span>{alert?.official ? "OFFICIAL ALERT" : "RISK INTELLIGENCE"}</span><span>{alert?.severity || "NORMAL"}</span></div><h2>{alert?.title || "No elevated model signal"}</h2><p>{alert?.description || "Current forecast data shows no significant hazard signal. VentusGPT continues to monitor the forecast context."}</p><div className="risk-advice">{alert?.actionAdvice || "Continue normal planning and check official updates when conditions are important."}</div><small>Source: {alert?.source || weather?.provider?.name || "Weather model"}</small></section></div>
    <div className="decision-row"><Decision icon={<CloudRain/>} label="RAIN CHANCE" value={`${days[0]?.precipitationProbability ?? 0}%`} note="today"/><Decision icon={<Wind/>} label="WIND GUST" value={`${Math.round(c?.windGusts ?? 0)} km/h`} note={c?.windGusts >= 40 ? "elevated" : "normal"}/><Decision icon={<Activity/>} label="UV INDEX" value={`${days[0]?.uv ?? "—"}`} note="peak"/><Decision icon={<Leaf/>} label="FIELD SIGNAL" value={days[0]?.precipitationProbability > 60 ? "WAIT" : "CHECK"} note="agriculture"/></div>
    <div className="section-title"><div><div className="eyebrow">NEXT 7 DAYS</div><h2>Forecast timeline</h2></div><span className="rain-peak">Rain peak · {Math.max(...days.map((d:any) => d.precipitationProbability || 0), 0)}%</span></div>
    <div className="forecast">{days.map((d:any,i:number)=><div className={`day ${i===0?"today":""}`} key={d.date}><span>{fmtDay(d.date,i)}</span><CloudRain/><strong>{Math.round(d.max)}° <em>{Math.round(d.min)}°</em></strong><small>{d.condition}</small><label>{d.precipitationProbability}% rain</label><div className="rain-bar"><i style={{width:`${Math.min(100,d.precipitationProbability||0)}%`}}/></div></div>)}</div>
    <div className="lower-grid"><section className="panel map-card"><div className="card-head"><div><div className="eyebrow">LOCATION CONTEXT</div><h2>{weather?.location}</h2></div><span className="coord">{weather?.coordinates?.latitude?.toFixed?.(3)}, {weather?.coordinates?.longitude?.toFixed?.(3)}</span></div>{weather?.coordinates ? <iframe title="location map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.coordinates.longitude-0.08}%2C${weather.coordinates.latitude-0.05}%2C${weather.coordinates.longitude+0.08}%2C${weather.coordinates.latitude+0.05}&layer=mapnik&marker=${weather.coordinates.latitude}%2C${weather.coordinates.longitude}`}/> : <div className="map-empty">Location context unavailable</div>}<div className="map-foot"><MapPin size={11}/> Weather context is centered on the selected location.</div></section><section className="panel ask-card"><div className="eyebrow">CONVERSATIONAL LAYER</div><h2>Ask anything.</h2><p>Weather facts are grounded in the live forecast. Ask follow-ups naturally and VentusGPT keeps the context.</p><div className="quick">{quickQuestions.map(q=><button key={q} onClick={()=>ask(q)}>{q}<Send size={12}/></button>)}</div></section></div>
    <div className="source-row"><b>PROVENANCE</b><span>{weather?.provider?.name}</span><span>{weather?.provider?.model}</span><span className="green">● Live forecast</span><span>Official warnings are shown separately when available.</span></div>
  </div>;
}

function Metric({icon,label,value}:any){return <div className="metric">{icon}<div><small>{label}</small><b>{value}</b></div></div>}
function Decision({icon,label,value,note}:any){return <div className="panel decision"><div className="decision-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>}

function ChatView({messages,input,setInput,ask,thinking,location}:any){return <div className="chat"><div className="chat-head"><div><div className="eyebrow">CONVERSATION / {location.toUpperCase()}</div><h1>Talk to <span style={{color:"var(--cyan)"}}>VentusGPT.</span></h1><p>Weather-grounded conversation with context across forecasts, risk and decisions.</p></div><span className="grounded">● WEATHER GROUNDED</span></div><div className="messages">{messages.length===0&&<div className="panel" style={{padding:24,marginTop:20}}><div className="eyebrow">START HERE</div><h2 style={{fontFamily:"Space Grotesk"}}>What do you need to know?</h2><div className="quick">{quickQuestions.map((q:string)=><button key={q} onClick={()=>ask(q)}>{q}<Send size={12}/></button>)}</div></div>}{messages.map((m:Message,i:number)=><div className={`message ${m.role}`} key={i}><div className="avatar">{m.role==="user"?"YOU":<img src="/favicon.svg" alt="V"/>}</div><div><div className="bubble"><p>{m.text}</p></div>{m.sources?.length?<div className="sources">{m.sources.map(s=><a key={s.uri} href={s.uri} target="_blank" rel="noreferrer">{s.title}<ExternalLink size={8}/></a>)}</div>:null}{m.role==="assistant"&&<button className="read" onClick={()=>window.speechSynthesis?.speak(new SpeechSynthesisUtterance(m.text))}><Volume2 size={11}/> Read aloud</button>}</div></div>)}{thinking&&<div className="message"><div className="avatar"><img src="/favicon.svg" alt="V"/></div><div className="typing">VentusGPT is reasoning <span/><span/><span/></div></div>}</div><form className="composer" onSubmit={e=>{e.preventDefault();ask()}}><button type="button" className="mic" onClick={()=>window.speechSynthesis && alert("Use Live Voice from the AI Studio for continuous voice conversation.")}><Mic size={17}/></button><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about weather, travel, farming, climate…"/><button className="send" type="submit"><Send size={17}/></button></form></div>}

function AlertsView({weather}:any){const a=weather?.alert;return <div className="page"><div className="page-intro"><div><div className="eyebrow">SAFETY / ALERT CENTER</div><h1>Signal, source, <span>action.</span></h1><p>VentusGPT keeps numerical-model signals separate from official meteorological warnings.</p></div></div><section className={`panel risk ${a?.official?"official-risk":a?.active?"danger":""}`} style={{maxWidth:850}}><div className="risk-label"><span>{a?.official?"OFFICIAL SOURCE":"MODEL SIGNAL"}</span><span>{a?.severity||"NORMAL"}</span></div><h2>{a?.title||"No elevated signal"}</h2><p>{a?.description||"No elevated hazard signal is currently detected."}</p><div className="risk-advice">{a?.actionAdvice||"Continue normal planning."}</div><small>Source: {a?.source||"NWP model"}</small></section><div className="signal-strip" style={{marginTop:14}}><div><b>LOCATION</b><span>{weather?.location}</span></div><div><b>STATUS</b><span>{a?.active?"Active signal":"Monitoring"}</span></div><div><b>AUTHORITY</b><span>{a?.official?"IMD":"Not official"}</span></div><div><b>RULE</b><span>Verify critical warnings</span></div></div></div>}

function FarmerView({location}:any){const [crop,setCrop]=useState("Paddy"),[activity,setActivity]=useState("Pesticide spraying"),[out,setOut]=useState<any>(null),[busy,setBusy]=useState(false);const run=async()=>{setBusy(true);try{setOut(await jsonFetch("/api/advisory/agri",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location,crop,activity})}))}catch(e:any){setOut({error:e.message})}finally{setBusy(false)}};return <div className="page"><div className="page-intro"><div><div className="eyebrow">DECISION SUPPORT / AGRICULTURE</div><h1>Field decisions, <span>grounded.</span></h1><p>Combine crop activity with forecast conditions to decide whether to proceed, postpone or verify.</p></div></div><div className="panel" style={{padding:22,maxWidth:850}}><div className="quick" style={{gridTemplateColumns:"1fr 1fr"}}><label style={{fontSize:9,color:"#66809a"}}>CROP<select value={crop} onChange={e=>setCrop(e.target.value)} style={{display:"block",width:"100%",marginTop:7,padding:10,background:"#091725",color:"#d9e8f5",border:"1px solid #ffffff12",borderRadius:9}}><option>Paddy</option><option>Banana</option><option>Groundnut</option><option>Tomato</option><option>Cotton</option></select></label><label style={{fontSize:9,color:"#66809a"}}>ACTIVITY<select value={activity} onChange={e=>setActivity(e.target.value)} style={{display:"block",width:"100%",marginTop:7,padding:10,background:"#091725",color:"#d9e8f5",border:"1px solid #ffffff12",borderRadius:9}}><option>Pesticide spraying</option><option>Irrigation</option><option>Fertilizer application</option><option>Harvesting</option></select></label></div><button className="outline" style={{marginTop:14}} onClick={run}>{busy?<Loader2 className="spin"/>:<Leaf size={14}/>} Analyze conditions</button></div>{out&&<section className={`panel risk ${out.decision==="HALT_POSTPONE"?"danger":""}`} style={{maxWidth:850,marginTop:14}}><div className="risk-label"><span>FIELD ADVISORY</span><span>{out.decision}</span></div><h2>{out.advice}</h2><p>{out.crop} · {out.activity} · {out.location}</p><div className="decision-row" style={{gridTemplateColumns:"1fr 1fr"}}><Decision icon={<CloudRain/>} label="RAIN PROBABILITY" value={`${out.rainfallProbability}%`} note="today"/><Decision icon={<Wind/>} label="WIND" value={`${out.windSpeedKmh} km/h`} note="forecast"/></div></section>}</div>}

function ClimateView({location}:any){const [data,setData]=useState<any>(null);useEffect(()=>{jsonFetch(`/api/climate/trend?location=${encodeURIComponent(location)}`).then(setData).catch(()=>setData(null))},[location]);return <div className="page"><div className="page-intro"><div><div className="eyebrow">HISTORICAL CONTEXT / 10 YEARS</div><h1>Climate, <span>not guesswork.</span></h1><p>Historical context helps explain trends. It is not a forecast.</p></div></div><section className="panel" style={{padding:22}}>{!data?<Loader2 className="spin"/>:<div>{data.years.map((y:any)=><div key={y.year} style={{display:"grid",gridTemplateColumns:"70px 1fr 110px 110px",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #ffffff09",fontSize:9}}><b>{y.year}</b><div className="rain-bar" style={{width:"100%"}}><i style={{width:`${Math.min(100,y.rainfall/15)}%`}}/></div><span>{y.rainfall} mm rain</span><span>{y.meanTemperature}°C avg</span></div>)}</div>}</section></div>}

function NwpView({location}:any){const [data,setData]=useState<any>(null);useEffect(()=>{jsonFetch(`/api/nwp/gfs?location=${encodeURIComponent(location)}&hours=48`).then(setData).catch(()=>setData(null))},[location]);return <div className="page"><div className="page-intro"><div><div className="eyebrow">NUMERICAL WEATHER PREDICTION</div><h1>Inside the <span>model.</span></h1><p>Inspect model output separately from official warnings. This is evidence, not authority.</p></div></div><section className="panel" style={{padding:22}}>{!data?<Loader2 className="spin"/>:<><div className="signal-strip">{Object.entries(data).slice(0,4).map(([k,v]:any)=><div key={k}><b>{k.toUpperCase()}</b><span>{typeof v==="object"?"available":String(v)}</span></div>)}</div><pre style={{whiteSpace:"pre-wrap",color:"#8da5bd",fontSize:9,lineHeight:1.6,overflow:"auto"}}>{JSON.stringify(data,null,2).slice(0,7000)}</pre></>}</section></div>}

function StudioView({tool,setTool,input,setInput,result,run}:any){const tools=[{name:"Research",icon:Search,placeholder:"Ask a current factual question…"},{name:"Calculate",icon:Calculator,placeholder:"Enter an expression or math problem…"},{name:"Vision",icon:ImageIcon,placeholder:"Describe what you want to analyze…"},{name:"Create",icon:Sparkles,placeholder:"Describe an image you want to create…"}];const current=tools.find(x=>x.name===tool)||tools[0];return <div className="page"><div className="page-intro"><div><div className="eyebrow">MULTIMODAL WORKSPACE</div><h1>AI <span>Studio.</span></h1><p>Research, calculate, inspect and create while staying inside the VentusGPT ecosystem.</p></div></div><div className="decision-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>{tools.map(t=>{const I=t.icon;return <button className="panel decision" key={t.name} onClick={()=>setTool(t.name)} style={{color:tool===t.name?"#dff7ff":"#8fa5bb",borderColor:tool===t.name?"#55c8ef44":"#ffffff0d"}}><div className="decision-icon"><I/></div><div><span>TOOL</span><b>{t.name}</b><small>{tool===t.name?"ACTIVE":"OPEN"}</small></div></button>})}</div><section className="panel" style={{padding:22,marginTop:14,maxWidth:900}}><div className="eyebrow">{tool.toUpperCase()}</div><h2 style={{fontFamily:"Space Grotesk",fontSize:25,margin:"8px 0"}}>{current.placeholder}</h2><div className="composer" style={{marginTop:18}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder={current.placeholder}/><button className="send" onClick={run}><Send size={16}/></button></div>{result&&<div className="bubble" style={{marginTop:18}}><p>{result}</p></div>}</section></div>}

export default App;
