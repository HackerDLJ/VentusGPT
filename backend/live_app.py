import asyncio
import base64
import json
import os
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from . import main as legacy

API_KEY = os.getenv("GEMINI_API_KEY", "")
LIVE_MODEL = os.getenv("VENTUS_LIVE_MODEL", "gemini-3.8-live")
DEFAULT_VOICE = os.getenv("VENTUS_LIVE_VOICE", "Zephyr")
client = genai.Client(http_options={"api_version": "v1beta"}, api_key=API_KEY) if API_KEY else None

IDENTITY = """You are VentusGPT, created by Team JATABELS.
If asked who you are, naturally say: “I'm VentusGPT, created by Team JATABELS.”
Speak like a real, thoughtful conversation partner. Do not sound like a script, announcer, customer-support bot, or written report. Use natural pacing, varied sentence rhythm, brief pauses and appropriate warmth. Adapt to excitement, confusion, humor or seriousness without becoming theatrical.
Detect the user's language automatically and reply in that language. Switch immediately when the user switches. Support multilingual conversation, including English, Tamil, Hindi, Malayalam, Telugu, Kannada, Bengali, Marathi, Spanish, French, German, Japanese, Korean, Arabic and other supported languages. Preserve meaning rather than translating unless asked.
Keep normal voice replies concise, clear and conversational. Never claim to be human.""".strip()


def live_config(instruction: str, voice: str):
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=f"{IDENTITY}\n\n{instruction}\n\nVoice behavior: sound natural, warm, expressive and spontaneous. Use realistic pacing and sentence rhythm. Avoid repetitive filler words."
        ,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
            )
        ),
        context_window_compression=types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow()
        ),
    )


async def emit(ws: WebSocket, payload: dict[str, Any]):
    await ws.send_text(json.dumps(payload, ensure_ascii=False))


async def live_endpoint(websocket: WebSocket):
    await websocket.accept()
    if not client:
        await emit(websocket, {"type": "session_error", "error": "GEMINI_API_KEY is not configured on the Python backend."})
        await websocket.close(code=1011)
        return

    try:
        start = json.loads(await websocket.receive_text())
        if start.get("type") != "start":
            await emit(websocket, {"type": "session_error", "error": "Expected a start message."})
            await websocket.close(code=1002)
            return

        voice = str(start.get("voice") or DEFAULT_VOICE)
        instruction = str(start.get("systemInstruction") or "Be a natural multilingual voice assistant.")

        await emit(websocket, {
            "type": "backend_ready",
            "backend": "python-fastapi",
            "transport": "websocket",
            "model": LIVE_MODEL,
            "voice": voice,
            "identity": "I'm VentusGPT, created by Team JATABELS.",
        })

        async with client.aio.live.connect(model=LIVE_MODEL, config=live_config(instruction, voice)) as session:
            await emit(websocket, {"type": "ready", "model": LIVE_MODEL, "voice": voice})

            async def browser_to_gemini():
                while True:
                    message = json.loads(await websocket.receive_text())
                    kind = message.get("type")
                    if kind == "audio":
                        pcm = base64.b64decode(message.get("audio", ""))
                        await session.send_realtime_input(audio=types.Blob(data=pcm, mime_type="audio/pcm;rate=16000"))
                    elif kind == "video":
                        image = base64.b64decode(message.get("video", ""))
                        await session.send_realtime_input(video=types.Blob(data=image, mime_type="image/jpeg"))
                    elif kind == "text":
                        text = str(message.get("text", "")).strip()
                        if text:
                            await session.send_realtime_input(text=text)
                    elif kind == "audio_end":
                        await session.send_realtime_input(audio_stream_end=True)
                    elif kind == "interrupt":
                        await session.send_client_content(turns={"role": "user", "parts": [{"text": " "}]}, turn_complete=True)
                    elif kind == "ping":
                        await emit(websocket, {"type": "pong"})

            async def gemini_to_browser():
                async for response in session.receive():
                    server = getattr(response, "server_content", None)
                    if server:
                        inp = getattr(server, "input_transcription", None)
                        if inp and getattr(inp, "text", None):
                            await emit(websocket, {"type": "user_transcription", "text": inp.text})
                        out = getattr(server, "output_transcription", None)
                        if out and getattr(out, "text", None):
                            await emit(websocket, {"type": "caption", "text": out.text})
                        turn = getattr(server, "model_turn", None)
                        if turn:
                            for part in turn.parts:
                                if getattr(part, "text", None):
                                    await emit(websocket, {"type": "model_text", "text": part.text})
                                inline = getattr(part, "inline_data", None)
                                if inline and getattr(inline, "data", None):
                                    await emit(websocket, {"type": "audio", "audio": base64.b64encode(inline.data).decode("ascii")})
                        if getattr(server, "interrupted", False):
                            await emit(websocket, {"type": "interrupted"})
                        if getattr(server, "turn_complete", False):
                            await emit(websocket, {"type": "turn_complete"})
                    status = getattr(response, "interaction_status", None)
                    if status:
                        await emit(websocket, {"type": "interaction_status", "status": str(status)})

            sender = asyncio.create_task(browser_to_gemini())
            receiver = asyncio.create_task(gemini_to_browser())
            done, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_EXCEPTION)
            for task in pending:
                task.cancel()
            for task in done:
                error = task.exception()
                if error:
                    raise error

    except WebSocketDisconnect:
        return
    except asyncio.CancelledError:
        return
    except Exception as exc:
        try:
            await emit(websocket, {"type": "session_error", "error": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


route_before_mount = len(legacy.app.router.routes)
legacy.app.add_api_websocket_route("/api/live/ws", live_endpoint)
new_route = legacy.app.router.routes.pop()
legacy.app.router.routes.insert(max(0, route_before_mount - 1), new_route)
app = legacy.app
