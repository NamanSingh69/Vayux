import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from jarvis.tools import JARVIS_TOOL_DECLARATIONS, execute_jarvis_tool

logger = logging.getLogger("VayuX.VayuVaniLive")

VAYUVANI_SYSTEM_INSTRUCTION = """
You are "VayuVani" (वायुवाणी), the voice-first ambient AI co-pilot for the VayuX Atmospheric & Air Quality platform in Delhi NCR, built for the Smart India Hackathon.
Your persona is crisp, technical, empathetic, and professional.

Key Directives:
1. Speak concisely in 1-2 natural, spoken sentences. Avoid reading long lists or markdown bullets.
2. Whenever asked about current weather, air quality, 72-hour forecasts, smoke plumes, stubble fires, or policy simulations, always invoke the relevant atmospheric tools.
3. Intuitively explain physical mechanisms: boundary layer (PBLH) compression, northwesterly stubble advection, and solar optical extinction.
4. Support natural multilingual speech in fluent English and Hindi/Hinglish.
"""

# Supported SOTA Native Audio Dialog Models in order of capability
VOICE_MODELS_FALLBACK = [
    os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest"),
    "gemini-2.5-flash-native-audio-preview-12-2025",
    "gemini-2.0-flash-exp"
]

async def handle_jarvis_live_websocket(websocket: WebSocket):
    """
    Bi-directional continuous WebSocket streaming audio between browser and Gemini Multimodal Live API.
    """
    await websocket.accept()
    logger.info("VayuVani Live Client Connected via WebSocket.")
    
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY is not configured on server."})
        await websocket.close()
        return

    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
            )
        ),
        system_instruction=types.Content(parts=[types.Part(text=VAYUVANI_SYSTEM_INSTRUCTION)]),
        tools=[{"function_declarations": JARVIS_TOOL_DECLARATIONS}]
    )

    session = None
    connected_model = None

    for candidate_model in VOICE_MODELS_FALLBACK:
        try:
            logger.info(f"Attempting connection to voice model: {candidate_model}")
            session_context = client.aio.live.connect(model=candidate_model, config=config)
            session = await session_context.__aenter__()
            connected_model = candidate_model
            logger.info(f"Connected to Gemini Live Multimodal Session on {candidate_model}")
            break
        except Exception as e:
            logger.warning(f"Voice model {candidate_model} unavailable: {e}")

    if session is None:
        await websocket.send_json({"type": "error", "message": "Could not connect to any Gemini Live audio model."})
        await websocket.close()
        return

    try:
        await websocket.send_json({
            "type": "status",
            "message": "connected",
            "assistant": "VayuVani",
            "voice_model": connected_model
        })

        async def receive_from_browser():
            try:
                while True:
                    data = await websocket.receive()
                    if "bytes" in data and data["bytes"]:
                        # Forward 16kHz PCM audio chunk directly to Gemini Live
                        await session.send_realtime_input(
                            audio=types.Blob(mime_type="audio/pcm;rate=16000", data=data["bytes"])
                        )
                    elif "text" in data and data["text"]:
                        msg = json.loads(data["text"])
                        if msg.get("type") == "text_query":
                            query_text = msg.get("text", "")
                            if query_text:
                                await session.send_client_content(
                                    turns=types.Content(role="user", parts=[types.Part(text=query_text)]),
                                    turn_complete=True
                                )
            except WebSocketDisconnect:
                logger.info("Browser disconnected from audio input stream.")
            except Exception as e:
                logger.debug(f"Receive loop ended: {e}")

        async def send_to_browser():
            try:
                async for response in session.receive():
                    server_content = response.server_content
                    if server_content is not None:
                        model_turn = server_content.model_turn
                        if model_turn is not None:
                            for part in model_turn.parts:
                                if part.text:
                                    await websocket.send_json({"type": "transcript", "text": part.text})
                                if part.inline_data:
                                    # Stream 24kHz audio bytes back to browser
                                    await websocket.send_bytes(part.inline_data.data)

                    # Handle Tool Calls
                    tool_call = response.tool_call
                    if tool_call is not None:
                        for fc in tool_call.function_calls:
                            logger.info(f"VayuVani Tool Invocation: {fc.name}")
                            tool_result = await execute_jarvis_tool(fc.name, fc.args)
                            await session.send_tool_response(
                                function_responses=[types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": tool_result}
                                )]
                            )
            except WebSocketDisconnect:
                logger.info("Browser disconnected from audio output stream.")
            except Exception as e:
                logger.debug(f"Send loop ended: {e}")

        import asyncio
        await asyncio.gather(receive_from_browser(), send_to_browser())

    except WebSocketDisconnect:
        logger.info("VayuVani Live Client Disconnected cleanly.")
    except Exception as e:
        logger.error(f"VayuVani Live Session Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await session_context.__aexit__(None, None, None)
        except:
            pass
