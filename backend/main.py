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
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PORT = int(os.getenv("PYTHON_PORT", "8000"))
API_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=API_KEY) if API_KEY else None

app = FastAPI(title="VentusGPT Intelligence Backend", version="2.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def require_ai():
    if not client:
        raise HTTPException(503, "GEMINI_API_KEY is not configured")
    return client


async def geocode(location: str):
    async with httpx.AsyncClient(timeout=12) as http:
        r = await http.get("https://geocoding-api.open-meteo.com/v1/search", params={"name": location, "count": 1, "language": "en", "format": "json"})
        r.raise_for_status()
        result = (r.json().get("results") or [None])[0]
        if not result:
            raise HTTPException(404, f"Location not found: {location}")
        return result


def condition(code: int) -> str:
    return {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Severe thunderstorm with hail"}.get(code, "Variable conditions")


def direction(deg: float) -> str:
    return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][round(deg / 22.5) % 16]


async def forecast(location: str):
    geo = await geocode(location)
    params = {
        "latitude": geo["latitude"], "longitude": geo["longitude"], "timezone": "auto", "forecast_days": 7,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset",
    }
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get("https://api.open-meteo.com/v1/forecast", params=params)
        r.raise_for_status()
        j = r.json()
    c, d = j["current"], j["daily"]
    days = []
    for i, date in enumerate(d["time"]):
        days.append({"date":date,"condition":condition(d["weather_code"][i]),"weatherCode":d["weather_code"][i],"min":d["temperature_2m_min"][i],"max":d["temperature_2m_max"][i],"feelsLikeMax":d["apparent_temperature_max"][i],"precipitation":d["precipitation_sum"][i],"precipitationProbability":d["precipitation_probability_max"][i],"wind":d["wind_speed_10m_max"][i],"gusts":d["wind_gusts_10m_max"][i],"windDirection":direction(d["wind_direction_10m_dominant"][i]),"uv":d["uv_index_max"][i],"sunrise":d["sunrise"][i],"sunset":d["sunset"][i]})
    gust = float(c.get("wind_gusts_10m") or 0)
    rain = float(d["precipitation_probability_max"][0] or 0)
    severe = gust >= 60 or int(c["weather_code"]) in {95,96,99}
    alert = {"active": severe or rain >= 85, "severity": "WARNING" if severe else ("WATCH" if rain >= 85 else "NONE"), "title": "Severe weather conditions detected" if severe else ("High rain probability" if rain >= 85 else "No active model alert"), "headline": "Use caution and verify official warnings.", "actions": ["Check official local warnings before high-risk activity."] if severe else []}
    return {"location":geo["name"],"coordinates":{"latitude":geo["latitude"],"longitude":geo["longitude"]},"country":geo.get("country"),"state":geo.get("admin1"),"timezone":j.get("timezone"),"current":{"temperature":c["temperature_2m"],"feelsLike":c["apparent_temperature"],"condition":condition(c["weather_code"]),"weatherCode":c["weather_code"],"humidity":c["relative_humidity_2m"],"precipitation":c["precipitation"],"pressure":c["surface_pressure"],"windSpeed":c["wind_speed_10m"],"windGusts":c["wind_gusts_10m"],"windDirection":direction(c["wind_direction_10m"])},"daily":days,"alert":alert,"provider":{"name":"Open-Meteo","model":"Best-match numerical model","live":True,"official":False,"updatedAt":datetime.utcnow().isoformat()+"Z"}}


def safe_math(expr: str):
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod, ast.USub, ast.UAdd, ast.Constant, ast.Call, ast.Name, ast.Load)
    tree = ast.parse(expr, mode="eval")
    if any(not isinstance(n, allowed) for n in ast.walk(tree)):
        raise ValueError("Unsupported expression")
    names = {k: getattr(math, k) for k in dir(math) if not k.startswith("_")}
    names.update({"pi": math.pi, "e": math.e})
    return eval(compile(tree, "<calculator>", "eval"), {"__builtins__": {}}, names)


@app.get("/api/health")
async def health():
    return {"ok": True, "status": "ok", "version": "2.1.0", "backend": "python-fastapi", "hasApiKey": bool(API_KEY), "liveApi": bool(API_KEY), "timestamp": datetime.utcnow().isoformat()+"Z"}


@app.get("/api/weather/forecast")
async def weather(location: str = "Chennai"):
    return await forecast(location)


class ChatBody(BaseModel):
    message: str
    history: list[dict[str, Any]] = []
    location: str = "Chennai"
    language: str = "en"
    imageBase64: str | None = None
    mimeType: str = "image/jpeg"


@app.post("/api/gemini/chat")
async def chat(body: ChatBody):
    ai = require_ai()
    wx = await forecast(body.location)
    history = "\n".join(f"{x.get('role','user')}: {x.get('text','')}" for x in body.history[-10:])
    prompt = f"""You are VentusGPT, a serious meteorological and climate intelligence assistant. Answer naturally and conversationally. Use the live weather context below when relevant. Clearly distinguish numerical-model information from official government warnings. Never invent an official warning. Prefer practical actions, explain uncertainty, and respond in {('Tamil' if body.language.startswith('ta') else 'English')} unless the user uses another language.\n\nLIVE WEATHER:\n{json.dumps(wx, ensure_ascii=False)}\n\nCONVERSATION:\n{history}\n\nUSER:\n{body.message}"""
    parts: list[Any] = []
    if body.imageBase64:
        parts.append(types.Part.from_bytes(data=base64.b64decode(body.imageBase64), mime_type=body.mimeType))
    parts.append(types.Part.from_text(text=prompt))
    response = await ai.aio.models.generate_content(model="gemini-2.5-flash", contents=types.Content(role="user", parts=parts), config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    sources = []
    for chunk in getattr(getattr(response, "candidates", [None])[0], "grounding_metadata", None).grounding_chunks if getattr(getattr(response, "candidates", [None])[0], "grounding_metadata", None) else []:
        web = getattr(chunk, "web", None)
        if web: sources.append({"title": getattr(web, "title", "Web result"), "uri": getattr(web, "uri", "")})
    return {"text": response.text or "I could not generate a response.", "sources": sources, "weather": wx}


@app.post("/api/tools/search")
async def search(body: dict[str, Any]):
    ai = require_ai(); q = str(body.get("query", "")).strip()
    if not q: raise HTTPException(400, "Query is required")
    response = await ai.aio.models.generate_content(model="gemini-2.5-flash", contents=q, config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    return {"result": response.text or "No result.", "sources": []}


@app.post("/api/tools/execute-code")
async def execute_code(body: dict[str, Any]):
    expr = str(body.get("expression", "")).strip()
    if not expr: raise HTTPException(400, "Expression is required")
    try: result = safe_math(expr)
    except Exception:
        ai = require_ai(); r = await ai.aio.models.generate_content(model="gemini-2.5-flash", contents=f"Solve this math problem and return the result with a short derivation: {expr}"); result = r.text
    return {"result": str(result)}


@app.post("/api/gemini/analyze")
async def analyze(body: dict[str, Any]):
    ai = require_ai(); parts = []
    if body.get("imageBase64"): parts.append(types.Part.from_bytes(data=base64.b64decode(body["imageBase64"]), mime_type=body.get("mimeType", "image/jpeg")))
    parts.append(types.Part.from_text(text=body.get("prompt", "Analyze this image in detail.")))
    r = await ai.aio.models.generate_content(model="gemini-2.5-flash", contents=types.Content(role="user", parts=parts), config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))
    return {"text": r.text or "No analysis generated.", "groundingChunks": []}


class LiveSession:
    def __init__(self, model: str, voice: str, instruction: str, language: str):
        self.id = uuid.uuid4().hex
        self.model = model
        self.voice = voice
        self.instruction = instruction
        self.language = language
        self.events: asyncio.Queue = asyncio.Queue()
        self.inputs: asyncio.Queue = asyncio.Queue()
        self.closed = False
        self.task: asyncio.Task | None = None

    async def start(self):
        self.task = asyncio.create_task(self._run())

    async def _run(self):
        try:
            ai = require_ai()
            config = types.LiveConnectConfig(response_modalities=["AUDIO"], system_instruction=self.instruction, input_audio_transcription=types.AudioTranscriptionConfig(), output_audio_transcription=types.AudioTranscriptionConfig(), speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self.voice))))
            async with ai.aio.live.connect(model=self.model, config=config) as session:
                await self.events.put({"type":"ready","sessionId":self.id,"model":self.model,"voice":self.voice})
                sender = asyncio.create_task(self._send_loop(session))
                async for response in session.receive():
                    sc = getattr(response, "server_content", None)
                    if sc:
                        if getattr(sc, "input_transcription", None): await self.events.put({"type":"user_transcription","text":sc.input_transcription.text,"finished":bool(getattr(sc, "finished", False))})
                        if getattr(sc, "output_transcription", None): await self.events.put({"type":"caption","text":sc.output_transcription.text})
                        if getattr(sc, "model_turn", None):
                            for part in sc.model_turn.parts:
                                if getattr(part, "text", None): await self.events.put({"type":"model_text","text":part.text})
                                if getattr(part, "inline_data", None) and getattr(part.inline_data, "data", None): await self.events.put({"type":"audio","audio":base64.b64encode(part.inline_data.data).decode()})
                        if getattr(sc, "turn_complete", False): await self.events.put({"type":"turn_complete"})
                sender.cancel()
        except Exception as e:
            await self.events.put({"type":"session_error","error":str(e)})
        finally:
            self.closed = True
            await self.events.put({"type":"session_closed","reason":"Session ended"})

    async def _send_loop(self, session):
        while True:
            msg = await self.inputs.get()
            typ = msg.get("type")
            if typ == "audio":
                await session.send_realtime_input(audio=types.Blob(data=base64.b64decode(msg["audio"]), mime_type="audio/pcm;rate=16000"))
            elif typ == "video":
                await session.send_realtime_input(video=types.Blob(data=base64.b64decode(msg["video"]), mime_type="image/jpeg"))
            elif typ == "text":
                await session.send_realtime_input(text=msg.get("text", ""))
            elif typ == "audio_end":
                await session.send_realtime_input(audio_stream_end=True)

    async def push(self, msg): await self.inputs.put(msg)
    async def stop(self):
        self.closed = True
        if self.task: self.task.cancel()


sessions: dict[str, LiveSession] = {}


@app.post("/api/live/session/start")
async def live_start(body: dict[str, Any]):
    s = LiveSession(body.get("model", "gemini-3.1-flash-live-preview"), body.get("voice", "Zephyr"), body.get("systemInstruction", "You are VentusGPT, a helpful weather intelligence assistant. Speak naturally and clearly."), body.get("targetLanguageCode", "en"))
    sessions[s.id] = s
    await s.start()
    return {"sessionId": s.id}


@app.get("/api/live/session/{session_id}/events")
async def live_events(session_id: str):
    s = sessions.get(session_id)
    if not s: raise HTTPException(404, "Live session not found")
    async def stream():
        while True:
            event = await s.events.get()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event.get("type") == "session_closed": break
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})


@app.post("/api/live/session/{session_id}/input")
async def live_input(session_id: str, body: dict[str, Any]):
    s = sessions.get(session_id)
    if not s: raise HTTPException(404, "Live session not found")
    await s.push(body); return {"ok": True}


@app.post("/api/live/session/{session_id}/stop")
async def live_stop(session_id: str):
    s = sessions.pop(session_id, None)
    if s: await s.stop()
    return {"ok": True}


# Serve the Vite production bundle when it exists. API routes remain above it.
if DIST.exists():
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="frontend")
