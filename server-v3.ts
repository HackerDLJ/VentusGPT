import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";
import { ImdProvider } from "./providers/imd.ts";
import { GfsProvider } from "./providers/gfs.ts";
import { evaluateArithmeticExpression } from "./src/services/safeCalculator.ts";

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imd = new ImdProvider();
const gfs = new GfsProvider();
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const cache = new Map<string, { at: number; value: any }>();
const getCache = (key: string) => { const x = cache.get(key); return x && Date.now() - x.at < 120000 ? x.value : undefined; };
const setCache = (key: string, value: any) => cache.set(key, { at: Date.now(), value });
app.use(express.json({ limit: "50mb" }));

async function locate(name: string) {
  const key = `geo:${name.toLowerCase()}`; const hit = getCache(key); if (hit) return hit;
  const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
  u.searchParams.set("name", name); u.searchParams.set("count", "1"); u.searchParams.set("language", "en"); u.searchParams.set("format", "json");
  const r = await fetch(u); if (!r.ok) throw new Error(`Geocoding failed (${r.status})`);
  const j:any = await r.json(); const x=j.results?.[0]; if(!x) throw new Error(`Location not found: ${name}`);
  const out={name:x.name,latitude:x.latitude,longitude:x.longitude,country:x.country,state:x.admin1,timezone:x.timezone}; setCache(key,out); return out;
}
const condition=(code:number)=>({0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Severe thunderstorm with hail"}[code]||"Variable conditions");
const direction=(d:number)=>["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d/22.5)%16];

async function forecast(location:string){
  const geo=await locate(location); const key=`wx:${geo.latitude.toFixed(3)}:${geo.longitude.toFixed(3)}`; const hit=getCache(key); if(hit)return hit;
  const u=new URL("https://api.open-meteo.com/v1/forecast"); u.searchParams.set("latitude",String(geo.latitude)); u.searchParams.set("longitude",String(geo.longitude)); u.searchParams.set("timezone","auto"); u.searchParams.set("forecast_days","7");
  u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m");
  u.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset");
  const r=await fetch(u); if(!r.ok)throw new Error(`Forecast failed (${r.status})`); const j:any=await r.json(),c=j.current,d=j.daily;
  const out:any={location:geo.name,coordinates:{latitude:geo.latitude,longitude:geo.longitude},country:geo.country,state:geo.state,timezone:j.timezone,current:{temperature:c.temperature_2m,feelsLike:c.apparent_temperature,condition:condition(c.weather_code),weatherCode:c.weather_code,humidity:c.relative_humidity_2m,precipitation:c.precipitation,pressure:c.surface_pressure,windSpeed:c.wind_speed_10m,windGusts:c.wind_gusts_10m,windDirection:direction(c.wind_direction_10m)},daily:d.time.map((date:string,i:number)=>({date,condition:condition(d.weather_code[i]),weatherCode:d.weather_code[i],min:d.temperature_2m_min[i],max:d.temperature_2m_max[i],feelsLikeMax:d.apparent_temperature_max[i],precipitation:d.precipitation_sum[i],precipitationProbability:d.precipitation_probability_max[i],wind:d.wind_speed_10m_max[i],gusts:d.wind_gusts_10m_max[i],windDirection:direction(d.wind_direction_10m_dominant[i]),uv:d.uv_index_max[i],sunrise:d.sunrise[i],sunset:d.sunset[i]})),provider:{name:"Open-Meteo",model:"Best-match numerical model",live:true,updatedAt:new Date().toISOString(),official:false}};
  out.alert=await resolveAlert(out); setCache(key,out); return out;
}
async function resolveAlert(wx:any){
  if(imd.configured){try{const official=await imd.districtWarning(wx.location);if(official)return{active:true,severity:"OFFICIAL",title:"Official IMD warning",description:"An official meteorological warning is available for this district.",actionAdvice:"Open the official bulletin and follow local authority instructions.",official:true,source:"India Meteorological Department",data:official};}catch(e){console.warn("IMD warning unavailable",e)}}
  const c=wx.current,rain=wx.daily[0]?.precipitationProbability||0,wind=c.windGusts||c.windSpeed||0;
  if(c.weatherCode>=95||wind>=60)return{active:true,severity:"WARNING",title:"Severe weather signal",description:"Thunderstorm or strong gust conditions are indicated by the numerical model.",actionAdvice:"Avoid exposed locations and verify the latest official IMD/NDMA bulletin.",official:false,source:"NWP model"};
  if(wind>=40||rain>=80)return{active:true,severity:"WATCH",title:"Elevated weather risk",description:"High rain probability or strong winds are indicated.",actionAdvice:"Plan outdoor activity carefully and check the latest official bulletin.",official:false,source:"NWP model"};
  return{active:false,severity:"NONE",title:"No elevated model signal",description:"No significant hazard signal is detected in the current model data.",actionAdvice:"Continue normal planning and check official updates when conditions are important.",official:false,source:"NWP model"};
}

function client(){ if(!ai) throw new Error("GEMINI_API_KEY is not configured."); return ai; }
async function generateWithFallback(request:any){
  const models=[request.model||"gemini-2.5-flash","gemini-flash-latest","gemini-2.5-flash-lite"];
  let last:any; for(const model of models){try{return await client().models.generateContent({...request,model});}catch(e:any){last=e;const s=String(e?.message||e);if(/429|quota|RESOURCE_EXHAUSTED/i.test(s))continue;throw e;}} throw last;
}

app.get("/api/health",(_,res)=>res.json({ok:true,status:"ok",version:"2.0.0",imdConfigured:imd.configured,gfs:true,legacyCapabilities:["voice","vision","search","calculator","image-generation","tts","transcription"]}));
app.get("/api/weather/forecast",async(req,res)=>{try{res.json(await forecast(String(req.query.location||"Chennai")))}catch(e:any){res.status(502).json({error:e.message})}});
app.get("/api/alerts",async(req,res)=>{try{const wx=await forecast(String(req.query.location||"Chennai"));res.json({location:wx.location,alert:wx.alert})}catch(e:any){res.status(502).json({error:e.message})}});
app.get("/api/nwp/gfs",async(req,res)=>{try{const wx=await locate(String(req.query.location||"Chennai"));res.json(await gfs.forecast(wx.latitude,wx.longitude,Number(req.query.hours||48)))}catch(e:any){res.status(502).json({error:e.message})}});
app.get("/api/imd/status",(_,res)=>res.json({configured:imd.configured,products:["current","forecast","nowcast","district-warning","rainfall","agromet"]}));
app.get("/api/climate/trend",async(req,res)=>{try{const geo=await locate(String(req.query.location||"Chennai"));const end=new Date(),start=new Date(end);start.setFullYear(start.getFullYear()-10);const f=(x:Date)=>x.toISOString().slice(0,10);const u=new URL("https://archive-api.open-meteo.com/v1/archive");u.searchParams.set("latitude",String(geo.latitude));u.searchParams.set("longitude",String(geo.longitude));u.searchParams.set("start_date",f(start));u.searchParams.set("end_date",f(end));u.searchParams.set("timezone","auto");u.searchParams.set("daily","temperature_2m_mean,precipitation_sum,wind_speed_10m_max");const r=await fetch(u);if(!r.ok)throw new Error(`Climate archive failed (${r.status})`);const j:any=await r.json(),m=new Map<number,any>();j.daily.time.forEach((date:string,i:number)=>{const y=+date.slice(0,4),v=m.get(y)||{rain:0,t:0,n:0,wind:0};v.rain+=j.daily.precipitation_sum[i]||0;v.t+=j.daily.temperature_2m_mean[i]||0;v.n++;v.wind=Math.max(v.wind,j.daily.wind_speed_10m_max[i]||0);m.set(y,v)});res.json({location:geo.name,years:[...m].map(([year,v])=>({year,rainfall:+v.rain.toFixed(1),meanTemperature:+(v.t/v.n).toFixed(1),maxWind:+v.wind.toFixed(1)})),provider:"Open-Meteo historical archive"})}catch(e:any){res.status(502).json({error:e.message})}});

app.post("/api/advisory/agri",async(req,res)=>{try{const location=req.body?.location||"Thanjavur",crop=req.body?.crop||"Paddy",activity=req.body?.activity||"pesticide spraying",wx=await forecast(location),d=wx.daily[0],safe=d.wind<=15&&d.precipitationProbability<40;res.json({location,crop,activity,decision:safe?"PROCEED_WITH_CAUTION":"HALT_POSTPONE",rainfallProbability:d.precipitationProbability,windSpeedKmh:d.wind,temperatureC:d.max,advice:safe?`Conditions are comparatively suitable for ${activity}; verify the latest local bulletin before proceeding.`:`Postpone ${activity}. Rain/wind conditions may cause wash-off or spray drift.`,source:wx.provider})}catch(e:any){res.status(502).json({error:e.message})}});

app.post("/api/advisory/disaster",async(req,res)=>{try{const location=String(req.body?.location||"Chennai"),hazardType=String(req.body?.hazardType||"WEATHER");const wx=await forecast(location);const a=wx.alert;res.json({id:`disaster-${Date.now()}`,location,hazardType,severity:a.official?"OFFICIAL":a.active?(a.severity==="WARNING"?"RED":"ORANGE"):"GREEN",headlineEn:a.title,headlineTa:`${a.title} - ${location}`,description:a.description,actionAdvice:a.actionAdvice,official:a.official,source:a.source,emergencyHelpline:"Use the official state/district emergency services for confirmed incidents."})}catch(e:any){res.status(502).json({error:e.message})}});

app.post("/api/tools/search",async(req,res)=>{try{const q=String(req.body?.query||"").trim();if(!q)return res.status(400).json({error:"Query is required"});const out=await generateWithFallback({contents:`Answer this query with current factual information: ${q}`,config:{tools:[{googleSearch:{}}]}});const chunks=out.candidates?.[0]?.groundingMetadata?.groundingChunks||[];res.json({result:out.text||"No result found.",sources:chunks.filter((x:any)=>x.web).map((x:any)=>({title:x.web.title||"Web result",uri:x.web.uri||""}))})}catch(e:any){res.status(500).json({error:e.message||"Search failed"})}});

app.post("/api/tools/execute-code",async(req,res)=>{try{const expression=String(req.body?.expression||"").trim();if(!expression)return res.status(400).json({error:"Expression is required"});let result:string|number;try{result=evaluateArithmeticExpression(expression)}catch{const out=await generateWithFallback({contents:`Solve this mathematical question precisely. Return the final result and a short derivation: ${expression}`});result=out.text||"Computation completed"}res.json({result:String(result)})}catch(e:any){res.status(500).json({error:e.message||"Computation failed"})}});

app.post("/api/gemini/analyze",async(req,res)=>{try{const prompt=String(req.body?.prompt||"Analyze this image in detail.");const parts:any[]=[];if(req.body?.imageBase64)parts.push({inlineData:{mimeType:req.body?.mimeType||"image/jpeg",data:req.body.imageBase64}});parts.push({text:prompt});const out=await generateWithFallback({contents:{parts},config:{tools:[{googleSearch:{}}]}});res.json({text:out.text||"No analysis generated.",groundingChunks:out.candidates?.[0]?.groundingMetadata?.groundingChunks||[]})}catch(e:any){res.status(500).json({error:e.message||"Analysis failed"})}});

app.post("/api/gemini/generate-image",async(req,res)=>{try{const prompt=String(req.body?.prompt||"").trim();if(!prompt)return res.status(400).json({error:"Prompt is required"});const out=await client().models.generateContent({model:"gemini-3.1-flash-lite-image",contents:{parts:[{text:prompt}]},config:{imageConfig:{aspectRatio:String(req.body?.aspectRatio||"1:1")}}});let imageUrl:string|null=null,description="";for(const p of out.candidates?.[0]?.content?.parts||[]){if(p.inlineData?.data)imageUrl=`data:${p.inlineData.mimeType||"image/png"};base64,${p.inlineData.data}`;else if(p.text)description+=p.text}if(!imageUrl)return res.status(502).json({error:"No image returned",text:description});res.json({imageUrl,description:description||prompt})}catch(e:any){res.status(500).json({error:e.message||"Image generation failed"})}});

app.post("/api/gemini/tts",async(req,res)=>{try{const text=String(req.body?.text||"").trim();if(!text)return res.status(400).json({error:"Text is required"});const out=await client().models.generateContent({model:"gemini-3.1-flash-tts-preview",contents:[{parts:[{text}]}],config:{responseModalities:[Modality.AUDIO],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:String(req.body?.voice||"Zephyr")}}}}});const audio=out.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;if(!audio)return res.status(502).json({error:"No audio generated"});res.json({audio,sampleRate:24000})}catch(e:any){res.status(500).json({error:e.message||"TTS failed"})}});

app.post("/api/gemini/transcribe",async(req,res)=>{try{const audioBase64=String(req.body?.audioBase64||"");if(!audioBase64)return res.status(400).json({error:"Audio data is required"});const out=await generateWithFallback({model:"gemini-2.5-flash",contents:{parts:[{inlineData:{mimeType:String(req.body?.mimeType||"audio/mp3"),data:audioBase64}},{text:"Transcribe this audio accurately with punctuation."}]}});res.json({transcription:out.text||""})}catch(e:any){res.status(500).json({error:e.message||"Transcription failed"})}});

app.post("/api/gemini/chat",async(req,res)=>{try{const{message,history=[],language="auto",location="Chennai"}=req.body||{};if(!message)return res.status(400).json({error:"message is required"});const wx=await forecast(location);const context=history.slice(-10).map((x:any)=>`${x.role}: ${x.text}`).join("\n");const prompt=`You are VentusGPT, a conversational multimodal weather intelligence agent for SIH26068. Preserve the original VentusGPT personality: useful voice-first assistance, grounded web research, vision, calculation, creativity and multilingual conversation. For live weather facts, use ONLY supplied weather context. Never invent observations. Clearly distinguish model-derived signals from official IMD warnings. If an official warning exists, prioritize it. Location: ${wx.location}. Weather: ${JSON.stringify(wx.current)}. Forecast: ${JSON.stringify(wx.daily)}. Alert: ${JSON.stringify(wx.alert)}.\nConversation:\n${context}\nUser: ${message}\nAnswer naturally in ${language==='ta'?"Tamil":language==='en'?"English":"the user's language"}. Be concise, practical and explain uncertainty when relevant.`;const out=await generateWithFallback({contents:prompt,config:{temperature:.2}});res.json({text:out.text||"I couldn't generate a response.",weather:wx,sources:[{title:"Open-Meteo",uri:"https://open-meteo.com/"},{title:"India Meteorological Department",uri:"https://mausam.imd.gov.in/"}]})}catch(e:any){res.status(500).json({error:e.message||"Chat failed"})}});

app.use(express.static(path.join(__dirname)));app.use(express.static(path.join(__dirname,"dist")));app.get("*",(_,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(port,()=>console.log(`VentusGPT v2 listening on ${port}`));
