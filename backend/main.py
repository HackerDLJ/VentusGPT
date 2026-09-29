import ast
import asyncio
import base64
import json
import math
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google import genai
from google.genai import types

load_dotenv()
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
API_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=API_KEY) if API_KEY else None

app = FastAPI(title="VentusGPT Intelligence Backend", version="2.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

VENTUS_IDENTITY = """You are VentusGPT, the conversational weather and climate intelligence assistant of Team JATABELS. When introducing yourself, naturally say: 'I'm VentusGPT, created by Team JATABELS.' Never claim to be an official government service. Distinguish numerical-model guidance from official warnings. Speak like a warm, intelligent human conversation partner, not a robotic announcer. Use natural pacing, concise turns, occasional light expressions, and adapt your tone to the user's emotion and situation. Respond in the user's language when clear. You can converse naturally in English, Tamil, and other languages supported by the model, and switch languages when the user switches. For safety-critical weather advice, recommend checking official local warnings."""


def require_ai():
    if not client:
        raise HTTPException(503, "GEMINI_API_KEY is not configured")
    return client


def condition(code: int) -> str:
    return {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Severe thunderstorm with hail"}.get(code, "Variable conditions")


def direction(deg: float) -> str:
    return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][round(deg / 22.5) % 16]


async def geocode(location: str):
    async with httpx.AsyncClient(timeout=12) as http:
        r = await http.get("https://geocoding-api.open-meteo.com/v1/search", params={"name": location, "count": 1, "language": "en", "format": "json"})
        r.raise_for_status()
        result = (r.json().get("results") or [None])[0]
        if not result:
            raise HTTPException(404, f"Location not found: {location}")
        return result


async def forecast(location: str):
    geo = await geocode(location)
    params = {"latitude":geo["latitude"],"longitude":geo["longitude"],"timezone":"auto","forecast_days":7,"current":"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m","daily":"weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset"}
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get("https://api.open-meteo.com/v1/forecast", params=params); r.raise_for_status(); j = r.json()
    c,d=j["current"],j["daily"]
    days=[]
    for i,date in enumerate(d["time"]):
        days.append({"date":date,"condition":condition(d["weather_code"][i]),"weatherCode":d["weather_code"][i],"min":d["temperature_2m_min"][i],"max":d["temperature_2m_max"][i],"feelsLikeMax":d["apparent_temperature_max"][i],"precipitation":d["precipitation_sum"][i],"precipitationProbability":d["precipitation_probability_max"][i],"wind":d["wind_speed_10m_max"][i],"gusts":d["wind_gusts_10m_max"][i],"windDirection":direction(d["wind_direction_10m_dominant"][i]),"uv":d["uv_index_max"][i],"sunrise":d["sunrise"][i],"sunset":d["sunset"][i]})
    gust=float(c.get("wind_gusts_10m") or 0); rain=float(d["precipitation_probability_max"][0] or 0); severe=gust>=60 or int(c["weather_code"]) in {95,96,99}
    return {"location":geo["name"],"coordinates":{"latitude":geo["latitude"],"longitude":geo["longitude"]},"country":geo.get("country"),"state":geo.get("admin1"),"timezone":j.get("timezone"),"current":{"temperature":c["temperature_2m"],"feelsLike":c["apparent_temperature"],"condition":condition(c["weather_code"]),"weatherCode":c["weather_code"],"humidity":c["relative_humidity_2m"],"precipitation":c["precipitation"],"pressure":c["surface_pressure"],"windSpeed":c["wind_speed_10m"],"windGusts":c["wind_gusts_10m"],"windDirection":direction(c["wind_direction_10m"])},"daily":days,"alert":{"active":severe or rain>=85,"severity":"WARNING" if severe else ("WATCH" if rain>=85 else "NONE"),"title":"Severe weather conditions detected" if severe else ("High rain probability" if rain>=85 else "No active model alert"),"headline":"Use caution and verify official warnings.","actions":["Check official local warnings before high-risk activity."] if severe else []},"provider":{"name":"Open-Meteo","model":"Best-match numerical model","live":True,"official":False,"updatedAt":datetime.utcnow().isoformat()+"Z"}}


def safe_math(expr: str):
    allowed=(ast.Expression,ast.BinOp,ast.UnaryOp,ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow,ast.Mod,ast.USub,ast.UAdd,ast.Constant,ast.Call,ast.Name,ast.Load)
    tree=ast.parse(expr,mode="eval")
    if any(not isinstance(n,allowed) for n in ast.walk(tree)): raise ValueError("Unsupported expression")
    names={k:getattr(math,k) for k in dir(math) if not k.startswith("_")}; names.update({"pi":math.pi,"e":math.e})
    return eval(compile(tree,"<calculator>","eval"),{"__builtins__":{}},names)


@app.get("/api/health")
async def health(): return {"ok":True,"status":"ok","version":"2.2.0","backend":"python-fastapi","hasApiKey":bool(API_KEY),"liveApi":bool(API_KEY),"timestamp":datetime.utcnow().isoformat()+"Z"}

@app.get("/api/weather/forecast")
async def weather(location: str="Chennai"): return await forecast(location)

class ChatBody(BaseModel):
    message:str; history:list[dict[str,Any]]=[]; location:str="Chennai"; language:str="en"; imageBase64:str|None=None; mimeType:str="image/jpeg"

@app.post("/api/gemini/chat")
async def chat(body:ChatBody):
    ai=require_ai(); wx=await forecast(body.location); history="\n".join(f"{x.get('role','user')}: {x.get('text','')}" for x in body.history[-10:])
    prompt=f"{VENTUS_IDENTITY}\n\nLIVE WEATHER:\n{json.dumps(wx,ensure_ascii=False)}\n\nCONVERSATION:\n{history}\n\nUSER:\n{body.message}"
    parts=[]
    if body.imageBase64: parts.append(types.Part.from_bytes(data=base64.b64decode(body.imageBase64),mime_type=body.mimeType))
    parts.append(types.Part.from_text(text=prompt))
    r=await ai.aio.models.generate_content(model="gemini-2.5-flash",contents=types.Content(role="user",parts=parts),config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    return {"text":r.text or "I could not generate a response.","sources":[],"weather":wx}

@app.post("/api/tools/search")
async def search(body:dict[str,Any]):
    ai=require_ai(); q=str(body.get("query","")).strip()
    if not q: raise HTTPException(400,"Query is required")
    r=await ai.aio.models.generate_content(model="gemini-2.5-flash",contents=q,config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    return {"result":r.text or "No result.","sources":[]}

@app.post("/api/tools/execute-code")
async def execute_code(body:dict[str,Any]):
    expr=str(body.get("expression","")).strip()
    if not expr: raise HTTPException(400,"Expression is required")
    try: result=safe_math(expr)
    except Exception: result=(await require_ai().aio.models.generate_content(model="gemini-2.5-flash",contents=f"Solve this math problem and give a concise derivation: {expr}")).text
    return {"result":str(result)}

@app.post("/api/gemini/analyze")
async def analyze(body:dict[str,Any]):
    ai=require_ai(); parts=[]
    if body.get("imageBase64"): parts.append(types.Part.from_bytes(data=base64.b64decode(body["imageBase64"]),mime_type=body.get("mimeType","image/jpeg")))
    parts.append(types.Part.from_text(text=body.get("prompt","Analyze this image in detail.")))
    r=await ai.aio.models.generate_content(model="gemini-2.5-flash",contents=types.Content(role="user",parts=parts),config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    return {"text":r.text or "No analysis generated.","groundingChunks":[]}


LIVE_TOOLS=[
    types.Tool(google_search=types.GoogleSearch()),
    types.Tool(function_declarations=[
        types.FunctionDeclaration(name="get_weather",description="Get current and 7-day numerical-model weather for a location. Never present this as an official warning.",parameters=types.Schema(type=types.Type.OBJECT,properties={"location":types.Schema(type=types.Type.STRING,description="City, district, or place")},required=["location"])),
        types.FunctionDeclaration(name="calculate",description="Evaluate a safe mathematical expression.",parameters=types.Schema(type=types.Type.OBJECT,properties={"expression":types.Schema(type=types.Type.STRING)},required=["expression"])),
    ])
]


def live_config(instruction:str,voice:str):
    return types.LiveConnectConfig(response_modalities=["AUDIO"],system_instruction=f"{VENTUS_IDENTITY}\n\n{instruction}",tools=LIVE_TOOLS,input_audio_transcription=types.AudioTranscriptionConfig(),output_audio_transcription=types.AudioTranscriptionConfig(),speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))),context_window_compression=types.ContextWindowCompressionConfig(trigger_tokens=104857,sliding_window=types.SlidingWindow(target_tokens=52428)))


class LiveSession:
    def __init__(self,model:str,voice:str,instruction:str,language:str):
        self.id=uuid.uuid4().hex; self.model=model; self.voice=voice; self.instruction=instruction; self.language=language; self.events=asyncio.Queue(); self.inputs=asyncio.Queue(); self.closed=False; self.task=None
    async def start(self): self.task=asyncio.create_task(self._run())
    async def _run(self):
        try:
            ai=require_ai()
            async with ai.aio.live.connect(model=self.model,config=live_config(self.instruction,self.voice)) as session:
                await self.events.put({"type":"ready","sessionId":self.id,"model":self.model,"voice":self.voice,"identity":"VentusGPT created by Team JATABELS"})
                sender=asyncio.create_task(self._send_loop(session))
                async for response in session.receive():
                    sc=getattr(response,"server_content",None)
                    tc=getattr(response,"tool_call",None)
                    if tc:
                        results=[]
                        for fc in getattr(tc,"function_calls",[]) or []:
                            try:
                                args=dict(getattr(fc,"args",{}) or {})
                                if fc.name=="get_weather": result=await forecast(args.get("location","Chennai"))
                                elif fc.name=="calculate": result={"result":str(safe_math(args.get("expression","0")))}
                                else: result={"error":"Unknown tool"}
                            except Exception as e: result={"error":str(e)}
                            results.append(types.FunctionResponse(name=fc.name,response=result,id=getattr(fc,"id",None)))
                            await self.events.put({"type":"tool","name":fc.name,"result":result})
                        if results: await session.send_tool_response(function_responses=results)
                    if sc:
                        inp=getattr(sc,"input_transcription",None)
                        out=getattr(sc,"output_transcription",None)
                        if inp: await self.events.put({"type":"user_transcription","text":getattr(inp,"text","")})
                        if out: await self.events.put({"type":"caption","text":getattr(out,"text","")})
                        turn=getattr(sc,"model_turn",None)
                        if turn:
                            for part in turn.parts:
                                if getattr(part,"text",None): await self.events.put({"type":"model_text","text":part.text})
                                inline=getattr(part,"inline_data",None)
                                if inline and getattr(inline,"data",None): await self.events.put({"type":"audio","audio":base64.b64encode(inline.data).decode()})
                        if getattr(sc,"turn_complete",False): await self.events.put({"type":"turn_complete"})
                sender.cancel()
        except Exception as e: await self.events.put({"type":"session_error","error":str(e)})
        finally: self.closed=True; await self.events.put({"type":"session_closed","reason":"Session ended"})
    async def _send_loop(self,session):
        while True:
            msg=await self.inputs.get(); typ=msg.get("type")
            if typ=="audio": await session.send_realtime_input(audio=types.Blob(data=base64.b64decode(msg["audio"]),mime_type="audio/pcm;rate=16000"))
            elif typ=="video": await session.send_realtime_input(video=types.Blob(data=base64.b64decode(msg["video"]),mime_type="image/jpeg"))
            elif typ=="text": await session.send_realtime_input(text=msg.get("text",""))
            elif typ=="audio_end": await session.send_realtime_input(audio_stream_end=True)
    async def push(self,msg): await self.inputs.put(msg)
    async def stop(self): self.closed=True; self.task.cancel() if self.task else None

sessions={}

@app.post("/api/live/session/start")
async def live_start(body:dict[str,Any]):
    instruction=body.get("systemInstruction", "Be conversational, concise, expressive, and multilingual. Prefer the user's language.")
    s=LiveSession(body.get("model","gemini-3.1-flash-live-preview"),body.get("voice","Zephyr"),instruction,body.get("targetLanguageCode","auto")); sessions[s.id]=s; await s.start(); return {"sessionId":s.id}

@app.get("/api/live/session/{session_id}/events")
async def live_events(session_id:str):
    s=sessions.get(session_id)
    if not s: raise HTTPException(404,"Live session not found")
    async def stream():
        while True:
            event=await s.events.get(); yield f"data: {json.dumps(event,ensure_ascii=False)}\n\n"
            if event.get("type")=="session_closed": break
    return StreamingResponse(stream(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})

@app.post("/api/live/session/{session_id}/input")
async def live_input(session_id:str,body:dict[str,Any]):
    s=sessions.get(session_id)
    if not s: raise HTTPException(404,"Live session not found")
    await s.push(body); return {"ok":True}

@app.post("/api/live/session/{session_id}/stop")
async def live_stop(session_id:str):
    s=sessions.pop(session_id,None)
    if s: await s.stop()
    return {"ok":True}

if DIST.exists(): app.mount("/",StaticFiles(directory=str(DIST),html=True),name="frontend")
