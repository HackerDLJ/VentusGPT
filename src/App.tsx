import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Bell, ChevronRight, CloudRain, Droplets, Leaf, MapPin, Menu, Mic, MicOff, RefreshCw, Send, ShieldCheck, Thermometer, Wind, X } from "lucide-react";
import "./index.css";

type Tab = "overview" | "chat" | "alerts" | "farmer" | "climate";
type Message = { role: "user" | "assistant"; text: string; sources?: { title: string; uri: string }[] };
const QUICK = ["Will it rain today?", "Any severe weather risk?", "Is tomorrow good for travelling?", "Can I spray pesticide tomorrow?"];

export default function App() {
  const [location, setLocation] = useState("Chennai");
  const [locationInput, setLocationInput] = useState("Chennai");
  const [weather, setWeather] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I'm VentusGPT. Ask me anything about weather, forecasts, alerts, climate, travel or farming. I'll ground weather answers in live model data and show the source." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<any>(null);
  const [climate, setClimate] = useState<any>(null);
  const [farmer, setFarmer] = useState({ crop: "Paddy", activity: "Pesticide spraying", result: null as any });

  const loadWeather = async (place = location) => {
    setError("");
    try { const r = await fetch(`/api/weather/forecast?location=${encodeURIComponent(place)}`); const d = await r.json(); if (!r.ok) throw Error(d.error); setWeather(d); setLocation(d.location); setLocationInput(d.location); }
    catch (e: any) { setError(e.message || "Weather service unavailable"); }
  };
  const loadAlerts = async () => { try { const r = await fetch(`/api/alerts?location=${encodeURIComponent(location)}`); const d = await r.json(); if (!r.ok) throw Error(d.error); setAlerts(d); } catch (e: any) { setError(e.message || "Alert service unavailable"); } };
  const loadClimate = async () => { try { const r = await fetch(`/api/climate/trend?location=${encodeURIComponent(location)}`); const d = await r.json(); if (!r.ok) throw Error(d.error); setClimate(d); } catch (e: any) { setError(e.message || "Climate service unavailable"); } };
  const runFarmer = async () => { try { const r = await fetch("/api/advisory/agri", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, crop: farmer.crop, activity: farmer.activity }) }); const d = await r.json(); if (!r.ok) throw Error(d.error); setFarmer(f => ({ ...f, result: d })); } catch (e: any) { setError(e.message || "Advisory service unavailable"); } };

  useEffect(() => { loadWeather("Chennai"); }, []);
  useEffect(() => { if (tab === "alerts") loadAlerts(); if (tab === "climate") loadClimate(); }, [tab, location]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim(); if (!text || loading) return; setInput(""); setTab("chat");
    const next = [...messages, { role: "user" as const, text }]; setMessages(next); setLoading(true);
    try { const r = await fetch("/api/gemini/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: next.slice(-10), location, language: /[\u0B80-\u0BFF]/.test(text) ? "ta" : "auto" }) }); const d = await r.json(); if (!r.ok) throw Error(d.error); setMessages(m => [...m, { role: "assistant", text: d.text, sources: d.sources }]); if (d.weather) setWeather(d.weather); }
    catch (e: any) { setMessages(m => [...m, { role: "assistant", text: `I couldn't reach the weather intelligence layer: ${e.message}` }]); } finally { setLoading(false); }
  };
  const voice = () => { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) return setError("Voice input is not supported in this browser."); if (listening) return; const r = new SR(); r.lang = "en-IN"; r.interimResults = false; r.onstart = () => setListening(true); r.onend = () => setListening(false); r.onerror = () => setListening(false); r.onresult = (e: any) => setInput(e.results[0][0].transcript); r.start(); };
  const speak = (text: string) => { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : "en-IN"; speechSynthesis.speak(u); };
  const current = weather?.current, today = weather?.daily?.[0];
  const maxRain = useMemo(() => Math.max(...(weather?.daily?.map((d: any) => d.precipitationProbability) || [0])), [weather]);

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setTab("overview")}><Menu size={19}/></button>
      <div className="brand"><img src="/branding/ventus-mark.svg"/><div><b>Ventus<span>GPT</span></b><small>WEATHER INTELLIGENCE</small></div></div>
      <div className="location"><MapPin size={15}/><input value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => e.key === "Enter" && loadWeather(locationInput)} /><button onClick={() => loadWeather(locationInput)}><ChevronRight size={17}/></button></div>
      <div className="top-actions"><button title="Refresh" onClick={() => loadWeather(location)}><RefreshCw size={17}/></button><span className="live"><i/> LIVE</span></div>
    </header>
    <div className="shell">
      <aside className="sidebar">
        <div className="nav-title">VENTUS</div>
        <Nav icon={<CloudRain/>} text="Overview" active={tab === "overview"} onClick={() => setTab("overview")}/>
        <Nav icon={<Send/>} text="Ask VentusGPT" active={tab === "chat"} onClick={() => setTab("chat")}/>
        <Nav icon={<Bell/>} text="Alert Center" active={tab === "alerts"} onClick={() => setTab("alerts")}/>
        <Nav icon={<Leaf/>} text="Farmer Mode" active={tab === "farmer"} onClick={() => setTab("farmer")}/>
        <Nav icon={<BarChart3/>} text="Climate Explorer" active={tab === "climate"} onClick={() => setTab("climate")}/>
        <div className="sidebar-bottom"><img src="/branding/ventus-wordmark.svg"/><span>Conversational AI for weather, alerts & climate.</span><em>SIH 26068</em></div>
      </aside>
      <main>
        {error && <div className="error"><AlertTriangle size={16}/>{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
        {tab === "overview" && <Overview weather={weather} today={today} maxRain={maxRain} alert={weather?.alert} onAsk={send}/>} 
        {tab === "chat" && <Chat messages={messages} input={input} setInput={setInput} send={send} loading={loading} voice={voice} listening={listening} speak={speak} location={location}/>} 
        {tab === "alerts" && <Alerts data={alerts} location={location} refresh={loadAlerts}/>} 
        {tab === "farmer" && <Farmer location={location} farmer={farmer} setFarmer={setFarmer} run={runFarmer}/>} 
        {tab === "climate" && <Climate data={climate} location={location}/>} 
      </main>
    </div>
  </div>;
}

function Nav({ icon, text, active, onClick }: any) { return <button className={active ? "nav active" : "nav"} onClick={onClick}>{icon}<span>{text}</span><ChevronRight className="nav-arrow"/></button>; }
function Metric({ icon, label, value }: any) { return <div className="metric">{icon}<div><small>{label}</small><b>{value}</b></div></div>; }

function Overview({ weather, today, maxRain, alert, onAsk }: any) {
  const c = weather?.current;
  return <div className="page">
    <div className="page-intro"><div><span className="eyebrow">WEATHER INTELLIGENCE</span><h1>Know the sky. <span>Make better decisions.</span></h1><p>Real-time conditions, forecasts and conversational insight for {weather?.location || "your location"}.</p></div><button className="outline" onClick={() => onAsk("Give me a complete weather briefing for today")}>Get briefing <ChevronRight size={16}/></button></div>
    <section className="hero-grid">
      <div className="hero panel"><div className="eyebrow"><i/> CURRENT CONDITIONS · {weather?.timezone || "LOCAL"}</div><div className="hero-main"><div><strong className="temp">{c ? Math.round(c.temperature) : "--"}°</strong><h2>{c?.condition || "Loading conditions"}</h2><p>Feels like {c?.feelsLike ?? "--"}° · {weather?.location || ""}</p></div><div className="hero-mark"><img src="/branding/ventus-mark.svg"/></div></div><div className="metrics"><Metric icon={<Droplets/>} label="Humidity" value={c ? `${c.humidity}%` : "--"}/><Metric icon={<Wind/>} label="Wind" value={c ? `${Math.round(c.windSpeed)} km/h ${c.windDirection}` : "--"}/><Metric icon={<Thermometer/>} label="Pressure" value={c ? `${Math.round(c.pressure)} hPa` : "--"}/><Metric icon={<CloudRain/>} label="Rain chance" value={today ? `${today.precipitationProbability}%` : "--"}/></div></div>
      <div className={alert?.active ? "risk panel danger" : "risk panel"}><div className="risk-label"><span>{alert?.active ? "MODEL RISK SIGNAL" : "SYSTEM STATUS"}</span><ShieldCheck size={16}/></div><h2>{alert?.title || "No elevated weather signal"}</h2><p>{alert?.description || "Current model data does not show an elevated local hazard signal."}</p><div className="risk-advice">{alert?.actionAdvice || "For severe weather, always verify the latest official IMD / NDMA bulletin."}</div><small>Model-derived · not an official warning</small></div>
    </section>
    <div className="section-title"><div><span className="eyebrow">NEXT 7 DAYS</span><h2>Forecast at a glance</h2></div><b className="rain-peak">Peak rain probability {maxRain}%</b></div>
    <div className="forecast">{(weather?.daily || []).map((d: any, i: number) => <div className={i === 0 ? "day today" : "day"} key={d.date}><span>{i === 0 ? "TODAY" : new Date(d.date).toLocaleDateString([], { weekday: "short" }).toUpperCase()}</span><CloudRain/><strong>{Math.round(d.max)}° <em>{Math.round(d.min)}°</em></strong><small>{d.condition}</small><label>Rain {d.precipitationProbability}%</label></div>)}</div>
    <div className="section-title"><div><span className="eyebrow">CONVERSATIONAL AI</span><h2>Ask the weather</h2></div></div><div className="quick">{QUICK.map(q => <button key={q} onClick={() => onAsk(q)}>{q}<ChevronRight size={16}/></button>)}</div>
    <div className="source-row"><span>DATA</span><b>{weather?.provider?.name || "Connecting…"}</b><span>UPDATED</span><b>{weather ? new Date(weather.provider.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</b><span>STATUS</span><b className="green">● LIVE MODEL DATA</b></div>
  </div>;
}

function Chat({ messages, input, setInput, send, loading, voice, listening, speak, location }: any) { return <div className="chat"><div className="chat-head"><div><span className="eyebrow">CONVERSATIONAL WEATHER AI</span><h1>Ask VentusGPT</h1><p>Context-aware answers for <b>{location}</b>.</p></div><span className="grounded">● GROUNDED</span></div><div className="messages">{messages.map((m: Message, i: number) => <div className={m.role === "user" ? "message user" : "message"} key={i}><div className="avatar">{m.role === "user" ? "YOU" : <img src="/branding/ventus-mark.svg"/>}</div><div className="bubble"><p>{m.text}</p>{m.sources && <div className="sources">{m.sources.map(s => <a href={s.uri} target="_blank" rel="noreferrer" key={s.uri}>{s.title} ↗</a>)}</div>}{m.role === "assistant" && <button className="read" onClick={() => speak(m.text)}>🔊 Read aloud</button>}</div></div>)}{loading && <div className="typing">● ● ● &nbsp; VentusGPT is checking weather data…</div>}</div><div className="composer"><button className={listening ? "mic on" : "mic"} onClick={voice}>{listening ? <MicOff/> : <Mic/>}</button><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about rain, wind, travel, farming or alerts…"/><button className="send" onClick={() => send()} disabled={loading}><Send/></button></div><div className="chips">{QUICK.map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div></div>; }

function Alerts({ data, location, refresh }: any) { const a = data?.alert; return <div className="page"><div className="page-intro"><div><span className="eyebrow">ALERT CENTER</span><h1>Weather risk, without the noise.</h1><p>Signals for {location}, with clear separation between model intelligence and official warnings.</p></div><button className="outline" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div><div className={a?.active ? "alert-large active" : "alert-large"}><div className="alert-icon">{a?.active ? <AlertTriangle/> : <ShieldCheck/>}</div><div><span>{a?.active ? a.severity : "NO ACTIVE MODEL SIGNAL"}</span><h2>{a?.title || "No elevated local hazard detected"}</h2><p>{a?.description || "VentusGPT has not detected an elevated hazard in the current model data."}</p><div className="advice">{a?.actionAdvice || "Continue normal planning and check official bulletins before acting on severe weather."}</div></div></div><div className="verification"><ShieldCheck/><div><b>Official-warning rule</b><p>VentusGPT never labels a model-derived signal as an official warning. For emergency decisions, verify IMD / NDMA / local authority alerts.</p></div></div></div>; }

function Farmer({ location, farmer, setFarmer, run }: any) { return <div className="page"><div className="page-intro"><div><span className="eyebrow">FARMER MODE</span><h1>Weather into field decisions.</h1><p>Choose the crop and activity. VentusGPT checks current forecast conditions before giving a practical recommendation.</p></div><span className="farmer-mark">🌾</span></div><div className="farmer-grid"><div className="panel form-panel"><label>LOCATION<input value={location} readOnly/></label><label>CROP<select value={farmer.crop} onChange={e => setFarmer((f: any) => ({ ...f, crop: e.target.value }))}><option>Paddy</option><option>Wheat</option><option>Maize</option><option>Groundnut</option><option>Cotton</option><option>Banana</option></select></label><label>ACTIVITY<select value={farmer.activity} onChange={e => setFarmer((f: any) => ({ ...f, activity: e.target.value }))}><option>Pesticide spraying</option><option>Fertilizer application</option><option>Irrigation</option><option>Harvesting</option><option>Field work</option></select></label><button className="primary" onClick={run}>Check field conditions <ChevronRight/></button></div><div className="panel decision">{farmer.result ? <><span className="eyebrow">VENTUS FIELD ADVISORY</span><h2 className={farmer.result.decision === "HALT_POSTPONE" ? "bad" : "good"}>{farmer.result.decision === "HALT_POSTPONE" ? "Postpone this activity" : "Conditions are comparatively suitable"}</h2><div className="decision-grid"><div><b>{farmer.result.rainfallProbability}%</b><small>Rain probability</small></div><div><b>{Math.round(farmer.result.windSpeedKmh)} km/h</b><small>Wind</small></div><div><b>{Math.round(farmer.result.temperatureC)}°C</b><small>Temperature</small></div></div><p>{farmer.result.advice}</p><small>Model-derived advisory · verify local agricultural guidance.</small></> : <div className="empty"><Leaf/><h2>Ready when you are.</h2><p>We'll check weather conditions for the selected crop activity.</p></div>}</div></div></div>; }

function Climate({ data, location }: any) { const years = data?.years || []; const max = Math.max(...years.map((x: any) => x.rainfall), 1); return <div className="page"><div className="page-intro"><div><span className="eyebrow">CLIMATE EXPLORER</span><h1>{location} over time.</h1><p>Historical context for rainfall, temperature and wind. Forecasts and climate history are kept separate.</p></div></div><div className="panel climate"><div className="section-title"><div><span className="eyebrow">ANNUAL RAINFALL</span><h2>Ten-year historical trend</h2></div><span className="source">{data?.provider || "Loading…"}</span></div>{years.length ? <div className="bars">{years.map((y: any) => <div className="bar-col" key={y.year}><b>{Math.round(y.rainfall)}</b><div className="bar" style={{ height: `${Math.max(8, y.rainfall / max * 190)}px` }}/><span>{y.year}</span></div>)}</div> : <div className="empty"><BarChart3/><p>Loading historical climate data…</p></div>}</div></div>; }
