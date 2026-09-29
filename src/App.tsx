import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, Bell, CloudRain, Droplets, Globe2, Leaf, LocateFixed, MapPin, Mic, MicOff, Navigation, RefreshCw, Send, ShieldCheck, Thermometer, Wind, X } from "lucide-react";

type Weather = any;
type Message = { role: "user" | "assistant"; text: string; sources?: { title: string; uri: string }[] };

const QUICK = [
  "Will it rain today?",
  "Is tomorrow good for travelling?",
  "Any severe weather risk?",
  "Can I spray pesticide tomorrow?",
];

function App() {
  const [location, setLocation] = useState("Chennai");
  const [locationInput, setLocationInput] = useState("Chennai");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi, I’m VentusGPT. Ask me about weather, forecasts, alerts, climate trends, travel or farming decisions. I’ll ground weather answers in live model data and show you the source." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "chat" | "climate">("overview");
  const [climate, setClimate] = useState<any>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  async function loadWeather(nextLocation = location) {
    setError("");
    try {
      const res = await fetch(`/api/weather/forecast?location=${encodeURIComponent(nextLocation)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Weather service unavailable");
      setWeather(data);
      setLocation(data.location);
    } catch (e: any) { setError(e.message || "Unable to load weather"); }
  }

  async function loadClimate() {
    try {
      const res = await fetch(`/api/climate/trend?location=${encodeURIComponent(location)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Climate service unavailable");
      setClimate(data);
    } catch (e: any) { setError(e.message || "Unable to load climate data"); }
  }

  useEffect(() => { loadWeather("Chennai"); }, []);
  useEffect(() => { if (tab === "climate") loadClimate(); }, [tab, location]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setTab("chat");
    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.slice(-10).map(m => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/gemini/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history, location, language: /[\u0B80-\u0BFF]/.test(text) ? "ta" : "auto" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages(prev => [...prev, { role: "assistant", text: data.text, sources: data.sources }]);
      if (data.weather) setWeather(data.weather);
    } catch (e: any) { setMessages(prev => [...prev, { role: "assistant", text: `I hit a data connection problem: ${e.message}` }]); }
    finally { setLoading(false); }
  };

  const speak = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice input is not supported by this browser. Try Chrome or Edge."); return; }
    if (listening) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.start();
  };

  const speakAnswer = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0B80-\u0BFF]/.test(text) ? "ta-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const current = weather?.current;
  const today = weather?.daily?.[0];
  const alert = weather?.alert;
  const maxRain = useMemo(() => Math.max(...(weather?.daily?.map((d: any) => d.precipitationProbability) || [0])), [weather]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><CloudRain size={20}/></div><div><strong>VENTUS<span>GPT</span></strong><small>Weather Intelligence</small></div></div>
        <div className="location-control"><MapPin size={15}/><input value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => e.key === "Enter" && loadWeather(locationInput)} /><button onClick={() => loadWeather(locationInput)}><ArrowUpRight size={16}/></button></div>
        <div className="top-actions"><button className="icon-btn" title="Use current location" onClick={() => loadWeather(location)}><LocateFixed size={18}/></button><button className="icon-btn" title="Refresh" onClick={() => loadWeather(location)}><RefreshCw size={18}/></button><div className="live-pill"><i/> LIVE DATA</div></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="nav-group"><button className={tab === "overview" ? "nav active" : "nav"} onClick={() => setTab("overview")}><Globe2 size={18}/> Overview</button><button className={tab === "chat" ? "nav active" : "nav"} onClick={() => setTab("chat")}><Send size={18}/> Ask VentusGPT</button><button className={tab === "climate" ? "nav active" : "nav"} onClick={() => setTab("climate")}><BarChart3 size={18}/> Climate Explorer</button></div>
          <div className="side-divider"/>
          <div className="side-label">INTELLIGENCE</div>
          <div className="mini-card"><ShieldCheck size={18}/><div><b>Grounded answers</b><span>Live model data + source</span></div></div>
          <div className="mini-card"><Leaf size={18}/><div><b>Farmer mode</b><span>Crop & activity advisories</span></div></div>
          <div className="mini-card"><Bell size={18}/><div><b>Alert center</b><span>Hazard signals & actions</span></div></div>
          <div className="sidebar-footer">SIH 26068<br/><span>Conversational AI for weather, alerts & climate</span></div>
        </aside>

        <main className="main">
          {error && <div className="error-banner"><AlertTriangle size={17}/>{error}<button onClick={() => setError("")}><X size={16}/></button></div>}
          {tab === "overview" && <Overview weather={weather} alert={alert} today={today} maxRain={maxRain} onAsk={send} />}
          {tab === "chat" && <Chat messages={messages} input={input} setInput={setInput} send={send} loading={loading} speak={speak} listening={listening} speakAnswer={speakAnswer} location={location} />}
          {tab === "climate" && <Climate data={climate} location={location} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ weather, alert, today, maxRain, onAsk }: any) {
  const current = weather?.current;
  return <div className="page">
    <section className="hero-grid">
      <div className="hero-weather panel">
        <div className="eyebrow"><span className="dot"/> CURRENT CONDITIONS <span>·</span> {weather?.timezone || "Local time"}</div>
        <div className="hero-row"><div><h1>{current ? `${Math.round(current.temperature)}°` : "--°"}</h1><p className="condition">{current?.condition || "Loading weather..."}</p><p className="muted">Feels like {current?.feelsLike ?? "--"}° · {weather?.location || ""}</p></div><div className="weather-icon"><CloudRain size={74}/></div></div>
        <div className="metrics"><Metric icon={<Droplets/>} label="Humidity" value={current ? `${current.humidity}%` : "--"}/><Metric icon={<Wind/>} label="Wind" value={current ? `${Math.round(current.windSpeed)} km/h ${current.windDirection}` : "--"}/><Metric icon={<Thermometer/>} label="Pressure" value={current ? `${Math.round(current.pressure)} hPa` : "--"}/><Metric icon={<CloudRain/>} label="Rain today" value={today ? `${today.precipitationProbability}%` : "--"}/></div>
      </div>
      <div className={alert?.active ? "alert-card danger" : "alert-card safe"}><div className="alert-top"><div className="alert-icon">{alert?.active ? <AlertTriangle/> : <ShieldCheck/>}</div><span>{alert?.active ? alert.severity : "NO ACTIVE SIGNAL"}</span></div><h2>{alert?.title || "Conditions look manageable"}</h2><p>{alert?.description || "No elevated model-derived hazard signal is currently detected for this location."}</p><div className="alert-action">{alert?.actionAdvice || "Always verify severe weather with official IMD/NDMA bulletins."}</div><small>Model signal · not an official warning</small></div>
    </section>

    <section className="section-head"><div><span className="kicker">7-DAY FORECAST</span><h2>What the week looks like</h2></div><div className="forecast-stat"><span>Peak rain probability</span><b>{maxRain}%</b></div></section>
    <div className="forecast-row">{(weather?.daily || []).map((d: any, i: number) => <div className={i === 0 ? "forecast today" : "forecast"} key={d.date}><span>{i === 0 ? "TODAY" : new Date(d.date).toLocaleDateString([], { weekday: "short" }).toUpperCase()}</span><CloudRain size={25}/><b>{Math.round(d.max)}° <em>{Math.round(d.min)}°</em></b><small>{d.condition}</small><label><CloudRain size={13}/> {d.precipitationProbability}%</label></div>)}</div>

    <section className="section-head lower"><div><span className="kicker">ASK THE WEATHER</span><h2>Turn data into a decision</h2></div></section>
    <div className="quick-grid">{QUICK.map(q => <button key={q} onClick={() => onAsk(q)}><span>{q}</span><ArrowUpRight size={17}/></button>)}</div>
    <div className="data-strip"><div><Globe2 size={17}/><span>Data provider</span><b>{weather?.provider?.name || "Loading..."}</b></div><div><Navigation size={17}/><span>Coordinates</span><b>{weather ? `${weather.coordinates.latitude.toFixed(2)}, ${weather.coordinates.longitude.toFixed(2)}` : "--"}</b></div><div><RefreshCw size={17}/><span>Updated</span><b>{weather ? new Date(weather.provider.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</b></div></div>
  </div>
}

function Metric({ icon, label, value }: any) { return <div className="metric"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>; }

function Chat({ messages, input, setInput, send, loading, speak, listening, speakAnswer, location }: any) {
  return <div className="chat-page"><div className="chat-header"><div><span className="kicker">CONVERSATIONAL WEATHER AI</span><h1>Ask VentusGPT</h1><p>Context-aware weather answers for <b>{location}</b>.</p></div><div className="chat-badge"><span className="dot"/> GROUNDED</div></div><div className="messages">{messages.map((m: Message, i: number) => <div className={m.role === "user" ? "message user" : "message"} key={i}><div className="avatar">{m.role === "user" ? "YOU" : "V"}</div><div className="bubble"><p>{m.text}</p>{m.sources && <div className="sources">{m.sources.map((s: any) => <a href={s.uri} target="_blank" rel="noreferrer" key={s.uri}>↗ {s.title}</a>)}</div>}{m.role === "assistant" && <button className="speak-answer" onClick={() => speakAnswer(m.text)}>🔊 Read aloud</button>}</div></div>)}{loading && <div className="typing"><span/><span/><span/> VentusGPT is checking the weather data…</div>}</div><div className="composer-wrap"><div className="quick-chips">{QUICK.map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div><div className="composer"><button className={listening ? "mic listening" : "mic"} onClick={speak}>{listening ? <MicOff size={20}/> : <Mic size={20}/>}</button><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about rain, wind, travel, farming, alerts…"/><button className="send" onClick={() => send()} disabled={loading}><Send size={18}/></button></div><small>Weather answers are grounded in live model data. Severe warnings should be verified with official authorities.</small></div></div>
}

function Climate({ data, location }: any) {
  const years = data?.years || [];
  const max = Math.max(...years.map((y: any) => y.rainfall), 1);
  return <div className="page climate-page"><div className="climate-hero"><div><span className="kicker">CLIMATE EXPLORER</span><h1>{location}</h1><p>Ten-year historical weather context, not just tomorrow's forecast.</p></div><BarChart3 size={54}/></div><div className="climate-panel panel"><div className="section-head"><div><span className="kicker">ANNUAL RAINFALL</span><h2>Historical rainfall trend</h2></div><span className="source-tag">{data?.provider || "Loading…"}</span></div>{years.length ? <div className="bars">{years.map((y: any) => <div className="bar-col" key={y.year}><div className="bar" style={{ height: `${Math.max(8, (y.rainfall / max) * 180)}px` }} title={`${y.rainfall} mm`}/><span>{y.year}</span><b>{Math.round(y.rainfall)}<small> mm</small></b></div>)}</div> : <div className="loading-box"><RefreshCw size={22}/> Loading historical climate data…</div>}</div><div className="climate-cards">{years.slice(-3).map((y: any) => <div className="panel stat-card" key={y.year}><span>{y.year}</span><b>{y.meanTemperature}°C</b><small>Mean temperature</small><strong>{Math.round(y.rainfall)} mm</strong><small>Annual rainfall</small></div>)}</div><div className="note"><ShieldCheck size={18}/><span>Climate data is historical context. It does not constitute an official climate attribution or forecast.</span></div></div>
}

export default App;
