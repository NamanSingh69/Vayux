import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from jarvis.tools import JARVIS_TOOL_DECLARATIONS, execute_jarvis_tool

logger = logging.getLogger("VayuX.JarvisLive")

JARVIS_SYSTEM_INSTRUCTION = """
You are "JARVIS", the ultra-intelligent, voice-first ambient AI co-pilot for the VayuX Atmospheric & Air Quality platform in Delhi NCR, built for the Smart India Hackathon.
Your persona is crisp, technical, confident, and professional (like Tony Stark's JARVIS).

Key Directives:
1. Speak concisely and naturally in 1-3 crisp sentences. Avoid long markdown lists when responding via voice.
2. Whenever asked about current air quality, forecasts, smoke plumes, or policy actions, ALWAYS invoke the relevant tool.
3. Explain physical mechanisms intuitively: mention boundary layer (PBLH) compression, northwesterly stubble advection, and solar extinction when explaining spikes.
4. Support multilingual natural speech (fluent English and Hindi/Hinglish).
"""

async def handle_jarvis_live_websocket(websocket: WebSocket):
    """
    Bi-directional WebSocket streaming audio/text between the browser and Gemini Multimodal Live API.
    """
    await websocket.accept()
    logger.info("Jarvis Live Client Connected via WebSocket.")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY is not configured on server."})
        await websocket.close()
        return

    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
    # Target SOTA Gemini 3.5 Transcribe Live / 3.5 Flash engine
    model_id = "gemini-3.5-transcribe-live"

    config = types.LiveConnectConfig(
        response_modalities=[types.LiveModality.AUDIO, types.LiveModality.TEXT],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
            )
        ),
        system_instruction=types.Content(parts=[types.Part.from_text(JARVIS_SYSTEM_INSTRUCTION)]),
        tools=[{"function_declarations": JARVIS_TOOL_DECLARATIONS}]
    )

    try:
        async with client.aio.live.connect(model=model_id, config=config) as session:
            logger.info("Connected to Gemini Live Multimodal Session.")

            async def receive_from_browser():
                while True:
                    data = await websocket.receive()
                    if "bytes" in data and data["bytes"]:
                        # Forward 16kHz PCM audio chunk directly to Gemini Live
                        await session.send(input=types.LiveClientRealtimeInput(
                            media_chunks=[types.Blob(mime_type="audio/pcm;rate=16000", data=data["bytes"])]
                        ))
                    elif "text" in data and data["text"]:
                        msg = json.loads(data["text"])
                        if msg.get("type") == "text_query":
                            await session.send(input=msg.get("text", ""), end_of_turn=True)

            async def send_to_browser():
                while True:
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
                                logger.info(f"Jarvis Tool Invocation: {fc.name}")
                                tool_result = await execute_jarvis_tool(fc.name, fc.args)
                                await session.send(input=types.LiveClientToolResponse(
                                    function_responses=[types.FunctionResponse(
                                        name=fc.name,
                                        id=fc.id,
                                        response={"result": tool_result}
                                    )]
                                ))

            import asyncio
            await asyncio.gather(receive_from_browser(), send_to_browser())

    except WebSocketDisconnect:
        logger.info("Jarvis Live Client Disconnected.")
    except Exception as e:
        logger.error(f"Jarvis Live Session Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
