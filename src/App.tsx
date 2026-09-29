import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Bell, Bot, ChevronRight, CloudRain, Droplets, Gauge, Leaf, MapPin, Menu, Mic, MicOff, Navigation, RefreshCw, Send, ShieldCheck, Sun, Thermometer, Wind, X } from "lucide-react";
import "./index.css";

type Tab = "overview" | "chat" | "alerts" | "farmer" | "climate" | "models";
type Message = { role: "user" | "assistant"; text: string; sources?: { title: string; uri: string }[] };
const QUICK = ["Will it rain today?", "What should I know about today?", "Is tomorrow good for travelling?", "Can I spray pesticide tomorrow?"];
const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: CloudRain },
  { id: "chat", label: "Ask VentusGPT", icon: Bot },
  { id: "alerts", label: "Alert Center", icon: Bell },
  { id: "farmer", label: "Farmer Mode", icon: Leaf },
  { id: "climate", label: "Climate Explorer", icon: BarChart3 },
  { id: "models", label: "NWP Lab", icon: Activity },
];

export default function App() {
  const [location, setLocation] = useState("Chennai");
  const [locationInput, setLocationInput] = useState("Chennai");
  const [weather, setWeather] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I'm VentusGPT. Ask me about weather, forecasts, alerts, climate or farming. I'll ground weather answers in live numerical-model data and show where the information came from." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<any>(null);
  const [climate, setClimate] = useState<any>(null);
  const [nwp, setNwp] = useState<any>(null);
  const [farmer, setFarmer] = useState({ crop: "Paddy", activity: "Pesticide spraying", result: null as any });

  const loadWeather = async (place = location) => {
    setError("");
    try {
      const r = await fetch(`/api/weather/forecast?location=${encodeURIComponent(place)}`);
      const d = await r.json(); if (!r.ok) throw Error(d.error);
      setWeather(d); setLocation(d.location); setLocationInput(d.location);
    } catch (e: any) { setError(e.message || "Weather service unavailable"); }
  };
  const loadAlerts = async () => { try { const r = await fetch(`/api/alerts?location=${encodeURIComponent(location)}`); const d = await r.json(); if (!r.ok) throw Error(d.error); setAlerts(d); } catch (e: any) { setError(e.message || "Alert service unavailable"); } };
  const loadClimate = async () => { try { const r = await fetch(`/api/climate/trend?location=${encodeURIComponent(location)}`); const d = await r.json(); if (!r.ok) throw Error(d.error); setClimate(d); } catch (e: any) { setError(e.message || "Climate service unavailable"); } };
  const loadNwp = async () => { try { const r = await fetch(`/api/nwp/gfs?location=${encodeURIComponent(location)}&hours=36`); const d = await r.json(); if (!r.ok) throw Error(d.error); setNwp(d); } catch (e: any) { setError(e.message || "NWP service unavailable"); } };
  const runFarmer = async () => { try { const r = await fetch("/api/advisory/agri", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, crop: farmer.crop, activity: farmer.activity }) }); const d = await r.json(); if (!r.ok) throw Error(d.error); setFarmer(f => ({ ...f, result: d })); } catch (e: any) { setError(e.message || "Advisory service unavailable"); } };

  useEffect(() => { loadWeather("Chennai"); }, []);
  useEffect(() => { if (tab === "alerts") loadAlerts(); if (tab === "climate") loadClimate(); if (tab === "models") loadNwp(); }, [tab, location]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim(); if (!text || loading) return;
    setInput(""); setTab("chat"); const next = [...messages, { role: "user" as const, text }]; setMessages(next); setLoading(true);
    try {
      const r = await fetch("/api/gemini/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: next.slice(-10), location, language: /[\u0B80-\u0BFF]/.test(text) ? "ta" : "auto" }) });
      const d = await r.json(); if (!r.ok) throw Error(d.error);
      setMessages(m => [...m, { role: "assistant", text: d.text, sources: d.sources }]); if (d.weather) setWeather(d.weather);
    } catch (e: any) { setMessages(m => [...m, { role: "assistant", text: `I couldn't reach the weather intelligence layer: ${e.message}` }]); } finally { setLoading(false); }
  };
  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setError("Voice input is not supported in this browser."); if (listening) return;
    const r = new SR(); r.lang = "en-IN"; r.interimResults = false; r.onstart = () => setListening(true); r.onend = () => setListening(false); r.onerror = () => setListening(false); r.onresult = (e: any) => setInput(e.results[0][0].transcript); r.start();
  };
  const speak = (text: string) => { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : "en-IN"; speechSynthesis.speak(u); };
  const current = weather?.current, today = weather?.daily?.[0];
  const maxRain = useMemo(() => Math.max(...(weather?.daily?.map((d: any) => d.precipitationProbability) || [0])), [weather]);
  const mapUrl = weather?.coordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${weather.coordinates.longitude - 0.18}%2C${weather.coordinates.latitude - 0.12}%2C${weather.coordinates.longitude + 0.18}%2C${weather.coordinates.latitude + 0.12}&layer=mapnik&marker=${weather.coordinates.latitude}%2C${weather.coordinates.longitude}` : "";

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setTab("overview")}><Menu size={18}/></button>
      <div className="brand"><img src="/branding/ventus-mark.svg"/><div><b>Ventus<span>GPT</span></b><small>WEATHER INTELLIGENCE</small></div></div>
      <div className="location"><MapPin size={15}/><input value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => e.key === "Enter" && loadWeather(locationInput)} /><button onClick={() => loadWeather(locationInput)}><ChevronRight size={17}/></button></div>
      <div className="top-actions"><button title="Refresh weather" onClick={() => loadWeather(location)}><RefreshCw size={17}/></button><span className="live"><i/> LIVE</span></div>
    </header>
    <div className="shell">
      <aside className="sidebar">
        <div className="nav-title">VENTUS COMMAND</div>
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "nav active" : "nav"} onClick={() => setTab(id)}><Icon/><span>{label}</span><ChevronRight className="nav-arrow"/></button>)}
        <div className="sidebar-status"><div><span className="status-dot"/> SYSTEM ONLINE</div><small>Weather intelligence stack</small></div>
        <div className="sidebar-bottom"><img src="/branding/ventus-wordmark.svg"/><span>Conversational intelligence for weather, alerts & climate.</span><em>SIH 26068 · v2.0 BUILD</em></div>
      </aside>
      <main>
        {error && <div className="error"><AlertTriangle size={16}/>{error}<button onClick={() => setError("")}><X size={15}/></button></div>}
        {tab === "overview" && <Overview weather={weather} today={today} maxRain={maxRain} alert={weather?.alert} onAsk={send} mapUrl={mapUrl}/>} 
        {tab === "chat" && <Chat messages={messages} input={input} setInput={setInput} send={send} loading={loading} voice={voice} listening={listening} speak={speak} location={location}/>} 
        {tab === "alerts" && <Alerts data={alerts} location={location} refresh={loadAlerts}/>} 
        {tab === "farmer" && <Farmer location={location} farmer={farmer} setFarmer={setFarmer} run={runFarmer}/>} 
        {tab === "climate" && <Climate data={climate} location={location}/>} 
        {tab === "models" && <Models data={nwp} location={location} refresh={loadNwp}/>} 
      </main>
    </div>
  </div>;
}

function Overview({ weather, today, maxRain, alert, onAsk, mapUrl }: any) {
  const c = weather?.current;
  const peak = weather?.daily?.reduce((a: any, b: any) => Number(b.precipitationProbability) > Number(a.precipitationProbability) ? b : a, weather?.daily?.[0]);
  return <div className="page">
    <div className="page-intro"><div><span className="eyebrow">VENTUS / WEATHER INTELLIGENCE</span><h1>Read the atmosphere. <span>Act with context.</span></h1><p>Live conditions, numerical forecasts, risk signals and conversational intelligence for {weather?.location || "your location"}.</p></div><button className="outline" onClick={() => onAsk("Give me a complete weather briefing for today")}>Generate briefing <ChevronRight size={16}/></button></div>
    <div className="signal-strip"><div><i className="signal-live"/> <b>LIVE WEATHER DATA</b><span>{weather?.provider?.name || "Connecting"}</span></div><div><b>MODEL</b><span>{weather?.provider?.model || "--"}</span></div><div><b>UPDATED</b><span>{weather ? new Date(weather.provider.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</span></div><div className={alert?.official ? "official" : "model"}><b>{alert?.official ? "OFFICIAL" : "MODEL"}</b><span>{alert?.official ? "IMD warning active" : "Risk signal only"}</span></div></div>
    <section className="hero-grid">
      <div className="hero panel"><div className="eyebrow"><i/> CURRENT CONDITIONS · {weather?.timezone || "LOCAL"}</div><div className="hero-main"><div><strong className="temp">{c ? Math.round(c.temperature) : "--"}°</strong><h2>{c?.condition || "Loading conditions"}</h2><p>Feels like {c?.feelsLike ?? "--"}° · {weather?.location || ""}</p></div><div className="hero-mark"><img src="/branding/ventus-mark.svg"/><span>{c?.windDirection || "--"}</span></div></div><div className="metrics"><Metric icon={<Droplets/>} label="Humidity" value={c ? `${c.humidity}%` : "--"}/><Metric icon={<Wind/>} label="Wind" value={c ? `${Math.round(c.windSpeed)} km/h` : "--"}/><Metric icon={<Gauge/>} label="Pressure" value={c ? `${Math.round(c.pressure)} hPa` : "--"}/><Metric icon={<CloudRain/>} label="Rain chance" value={today ? `${today.precipitationProbability}%` : "--"}/></div></div>
      <div className={alert?.active ? `risk panel ${alert.official ? "official-risk" : "danger"}` : "risk panel"}><div className="risk-label"><span>{alert?.official ? "OFFICIAL IMD SIGNAL" : alert?.active ? "MODEL RISK SIGNAL" : "SYSTEM STATUS"}</span>{alert?.official ? <Bell size={16}/> : <ShieldCheck size={16}/>}</div><h2>{alert?.title || "No elevated weather signal"}</h2><p>{alert?.description || "Current model data does not show an elevated local hazard signal."}</p><div className="risk-advice">{alert?.actionAdvice || "For severe weather, verify the latest official IMD / NDMA bulletin before acting."}</div><small>{alert?.official ? `Source: ${alert.source || "India Meteorological Department"}` : "Model-derived · not an official warning"}</small></div>
    </section>
    <div className="decision-row"><Decision icon={<CloudRain/>} label="Rain window" value={peak ? `${peak.precipitationProbability}%` : "--"} note={peak ? `Peak probability · ${new Date(peak.date).toLocaleDateString([], { weekday: "short" })}` : "Forecast loading"}/><Decision icon={<Wind/>} label="Peak wind" value={today ? `${Math.round(today.wind)} km/h` : "--"} note="Today's forecast maximum"/><Decision icon={<Sun/>} label="UV index" value={today?.uv ?? "--"} note="Today's maximum"/><Decision icon={<Navigation/>} label="Sunset" value={today?.sunset ? new Date(today.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} note="Local time"/></div>
    <div className="section-title"><div><span className="eyebrow">NEXT 7 DAYS</span><h2>Forecast at a glance</h2></div><b className="rain-peak">Peak rain probability {maxRain}%</b></div>
    <div className="forecast">{(weather?.daily || []).map((d: any, i: number) => <div className={i === 0 ? "day today" : "day"} key={d.date}><span>{i === 0 ? "TODAY" : new Date(d.date).toLocaleDateString([], { weekday: "short" }).toUpperCase()}</span><CloudRain/><strong>{Math.round(d.max)}° <em>{Math.round(d.min)}°</em></strong><small>{d.condition}</small><label>Rain {d.precipitationProbability}%</label><div className="rain-bar"><i style={{ width: `${Math.min(100, d.precipitationProbability)}%` }}/></div></div>)}</div>
    <div className="lower-grid"><div className="map-card panel"><div className="card-head"><div><span className="eyebrow">LOCATION CONTEXT</span><h2>{weather?.location || "Your location"}</h2></div><span className="coord">{weather?.coordinates ? `${weather.coordinates.latitude.toFixed(3)}°, ${weather.coordinates.longitude.toFixed(3)}°` : "--"}</span></div>{mapUrl ? <iframe title="Location map" src={mapUrl} loading="lazy"/> : <div className="map-empty">Waiting for location coordinates…</div>}<div className="map-foot"><MapPin size={13}/> Location map · OpenStreetMap · not a weather radar</div></div><div className="ask-card panel"><span className="eyebrow">CONVERSATIONAL AI</span><h2>Ask the atmosphere.</h2><p>Follow-up questions keep your location and weather context in the conversation.</p><div className="quick">{QUICK.map(q => <button key={q} onClick={() => onAsk(q)}>{q}<ChevronRight size={15}/></button>)}</div></div></div>
    <div className="source-row"><span>DATA</span><b>{weather?.provider?.name || "Connecting…"}</b><span>MODEL</span><b>{weather?.provider?.model || "--"}</b><span>STATUS</span><b className="green">● LIVE</b><span>WARNING SOURCE</span><b>{alert?.official ? "IMD" : "Official source verification required"}</b></div>
  </div>;
}

function Decision({ icon, label, value, note }: any) { return <div className="decision panel"><div className="decision-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{note}</small></div></div>; }
function Metric({ icon, label, value }: any) { return <div className="metric">{icon}<div><small>{label}</small><b>{value}</b></div></div>; }

function Chat({ messages, input, setInput, send, loading, voice, listening, speak, location }: any) { return <div className="chat"><div className="chat-head"><div><span className="eyebrow">CONVERSATIONAL WEATHER AI</span><h1>Ask VentusGPT</h1><p>Context-aware weather intelligence for <b>{location}</b>. Ask naturally, then ask a follow-up.</p></div><span className="grounded">● DATA-GROUNDED</span></div><div className="messages">{messages.map((m: Message, i: number) => <div className={m.role === "user" ? "message user" : "message"} key={i}><div className="avatar">{m.role === "user" ? "YOU" : <img src="/branding/ventus-mark.svg"/>}</div><div className="bubble"><p>{m.text}</p>{m.sources && <div className="sources">{m.sources.map(s => <a href={s.uri} target="_blank" rel="noreferrer" key={s.uri}>{s.title} ↗</a>)}</div>}{m.role === "assistant" && <button className="read" onClick={() => speak(m.text)}>🔊 Read aloud</button>}</div></div>)}{loading && <div className="typing"><span/> <span/> <span/> VentusGPT is checking the weather layer…</div>}</div><div className="composer"><button className={listening ? "mic on" : "mic"} onClick={voice}>{listening ? <MicOff/> : <Mic/>}</button><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about rain, wind, travel, farming or alerts…"/><button className="send" onClick={() => send()} disabled={loading}><Send/></button></div><div className="chips">{QUICK.map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div></div>; }

function Alerts({ data, location, refresh }: any) { const a = data?.alert; return <div className="page"><div className="page-intro"><div><span className="eyebrow">ALERT CENTER</span><h1>Weather risk, without the noise.</h1><p>Official warnings and model-derived signals are deliberately separated so users know what they are looking at.</p></div><button className="outline" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div><div className={a?.official ? "alert-large official-alert" : a?.active ? "alert-large active" : "alert-large"}><div className="alert-icon">{a?.active ? <AlertTriangle/> : <ShieldCheck/>}</div><div><span>{a?.official ? "OFFICIAL IMD" : a?.active ? a.severity : "NO ACTIVE MODEL SIGNAL"}</span><h2>{a?.title || "No elevated local hazard detected"}</h2><p>{a?.description || "VentusGPT has not detected an elevated hazard in the current model data."}</p><div className="advice">{a?.actionAdvice || "Continue normal planning and check official bulletins before acting on severe weather."}</div><small>{a?.source || "NWP model"}</small></div></div><div className="alert-grid"><div className="verification"><ShieldCheck/><div><b>Source discipline</b><p>VentusGPT never labels a model-derived signal as an official warning. Official alerts take precedence when an authenticated IMD product is available.</p></div></div><div className="verification"><Activity/><div><b>Model intelligence</b><p>Numerical-model signals are useful context, not emergency authority. For safety-critical decisions, verify the latest official bulletin.</p></div></div></div></div>; }

function Farmer({ location, farmer, setFarmer, run }: any) { return <div className="page"><div className="page-intro"><div><span className="eyebrow">FARMER MODE</span><h1>Weather into field decisions.</h1><p>Select the crop and activity. VentusGPT checks forecast conditions and explains the decision instead of dumping raw weather numbers.</p></div><span className="farmer-mark">🌾</span></div><div className="farmer-grid"><div className="panel form-panel"><label>LOCATION<input value={location} readOnly/></label><label>CROP<select value={farmer.crop} onChange={e => setFarmer((f: any) => ({ ...f, crop: e.target.value }))}><option>Paddy</option><option>Wheat</option><option>Maize</option><option>Groundnut</option><option>Cotton</option><option>Banana</option></select></label><label>ACTIVITY<select value={farmer.activity} onChange={e => setFarmer((f: any) => ({ ...f, activity: e.target.value }))}><option>Pesticide spraying</option><option>Fertilizer application</option><option>Irrigation</option><option>Harvesting</option><option>Field work</option></select></label><button className="primary" onClick={run}>Analyze field conditions <ChevronRight/></button><p className="form-note">Advisory is weather-informed and model-derived. It does not replace local agronomist or official agricultural guidance.</p></div><div className="panel decision-panel">{farmer.result ? <><span className="eyebrow">VENTUS FIELD ADVISORY · {farmer.result.crop}</span><h2 className={farmer.result.decision === "HALT_POSTPONE" ? "bad" : "good"}>{farmer.result.decision === "HALT_POSTPONE" ? "Postpone this activity" : "Conditions are comparatively suitable"}</h2><div className="decision-grid"><div><b>{farmer.result.rainfallProbability}%</b><small>Rain probability</small></div><div><b>{Math.round(farmer.result.windSpeedKmh)} km/h</b><small>Wind</small></div><div><b>{Math.round(farmer.result.temperatureC)}°C</b><small>Temperature</small></div></div><p>{farmer.result.advice}</p><div className="advisory-rule"><ShieldCheck size={15}/><span>Verify local agricultural guidance before acting.</span></div></> : <div className="empty"><Leaf/><h2>Ready when you are.</h2><p>We'll translate forecast conditions into a practical field recommendation.</p></div>}</div></div></div>; }

function Climate({ data, location }: any) { const years = data?.years || []; const max = Math.max(...years.map((x: any) => x.rainfall), 1); return <div className="page"><div className="page-intro"><div><span className="eyebrow">CLIMATE EXPLORER</span><h1>{location} over time.</h1><p>Historical context for rainfall, temperature and wind. Forecasts and climate history stay separate so trends aren't mistaken for tomorrow's weather.</p></div></div><div className="panel climate"><div className="section-title"><div><span className="eyebrow">ANNUAL RAINFALL</span><h2>Ten-year historical trend</h2></div><span className="source">{data?.provider || "Loading…"}</span></div>{years.length ? <div className="bars">{years.map((y: any) => <div className="bar-col" key={y.year}><b>{Math.round(y.rainfall)}</b><div className="bar" style={{ height: `${Math.max(8, y.rainfall / max * 190)}px` }}/><span>{y.year}</span></div>)}</div> : <div className="empty"><BarChart3/><p>Loading historical climate data…</p></div>}</div><div className="climate-note"><Activity size={15}/><span>Historical archive: useful for context, not a direct prediction of future weather.</span></div></div>; }

function Models({ data, location, refresh }: any) { const v = data?.variables || {}; const times = v.time || []; const probs = v.precipitationProbability || []; const winds = v.wind || []; const maxP = Math.max(...probs.slice(0, 18).map(Number), 1); return <div className="page"><div className="page-intro"><div><span className="eyebrow">NWP LAB · {location.toUpperCase()}</span><h1>Look inside the forecast.</h1><p>Expose numerical-model output instead of hiding it behind the chatbot. This view is designed for technical evaluation and future multi-model comparison.</p></div><button className="outline" onClick={refresh}><RefreshCw size={15}/> Refresh model</button></div><div className="model-banner"><div><span className="eyebrow">MODEL PROVIDER</span><h2>{data?.provider || "GFS"}</h2><p>Hourly numerical forecast · {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "loading"}</p></div><div className="model-chip"><Activity size={15}/> NWP DATA</div></div><div className="model-grid"><div className="panel model-chart"><div className="section-title"><div><span className="eyebrow">PRECIPITATION PROBABILITY</span><h2>Next 18 hours</h2></div></div><div className="nwp-bars">{probs.slice(0,18).map((p: any, i: number) => <div className="nwp-col" key={i}><div className="nwp-bar" style={{ height: `${Math.max(5, Number(p || 0) / maxP * 150)}px` }}/><b>{Math.round(Number(p || 0))}%</b><span>{times[i] ? new Date(times[i]).toLocaleTimeString([], { hour: "2-digit" }) : "--"}</span></div>)}</div></div><div className="panel model-stats"><span className="eyebrow">MODEL SIGNALS</span><Stat icon={<Wind/>} label="Peak wind" value={`${Math.round(Math.max(...winds.slice(0, 18).map(Number), 0))} km/h`}/><Stat icon={<CloudRain/>} label="Peak rain probability" value={`${Math.round(Math.max(...probs.slice(0, 18).map(Number), 0))}%`}/><Stat icon={<Gauge/>} label="Forecast horizon" value={`${times.length || 0} h`}/><div className="model-disclaimer"><ShieldCheck size={14}/><span>NWP output is model guidance, not an official warning.</span></div></div></div></div>; }
function Stat({ icon, label, value }: any) { return <div className="stat"><div>{icon}</div><span>{label}</span><b>{value}</b></div>; }
