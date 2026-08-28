import os, sys, asyncio, json
from dotenv import load_dotenv
load_dotenv(r'c:\Users\namsi\Documents\antigravity\eager-volta\backend\.env')

parent_dir = r'c:\Users\namsi\Documents\antigravity\eager-volta\backend'
sys.path.insert(0, parent_dir)

from google import genai
from google.genai import types
from jarvis.tools import JARVIS_TOOL_DECLARATIONS, execute_jarvis_tool

api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key)

system_prompt = '''You are JARVIS, the voice AI co-pilot for VayuX in Delhi NCR. Crisp, technical, 1-3 sentences. Always invoke tools for live data.'''

async def test():
    queries = [
        "Jarvis, why is the air quality severe in Anand Vihar tonight? Check atmospheric physics.",
        "Jarvis, give me the 72-hour air quality forecast for Delhi.",
        "Jarvis, simulate what happens if we impose GRAP Stage 4 with a 50% vehicle reduction and 80% stubble fire suppression."
    ]
    for q in queries:
        print('=' * 60)
        print('Asked:', q)
        res = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=q,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[{'function_declarations': JARVIS_TOOL_DECLARATIONS}]
            )
        )
        if res.function_calls:
            for call in res.function_calls:
                print(f'[Tool Called]: {call.name}({dict(call.args)})')
                tool_output = await execute_jarvis_tool(call.name, dict(call.args))
                print(f'[Tool Result]: {json.dumps(tool_output)[:180]}...')
                synth = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[
                        types.Content(role='user', parts=[types.Part(text=q)]),
                        types.Content(role='model', parts=[types.Part(function_call=types.FunctionCall(name=call.name, args=dict(call.args)))]),
                        types.Content(role='user', parts=[types.Part(function_response=types.FunctionResponse(name=call.name, response={'result': tool_output}))])
                    ],
                    config=types.GenerateContentConfig(system_instruction=system_prompt)
                )
                print(f'[JARVIS]: {synth.text.strip()}\n')
        else:
            print('[JARVIS]:', res.text.strip())

if __name__ == '__main__':
    asyncio.run(test())
