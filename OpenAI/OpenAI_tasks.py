import os, json, time
import openai
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

def call_openai_chat(model: str, messages: list, max_tokens: int = 512, temperature: float = 0.0) -> Dict:
    for attempt in range(3):
        try:
            resp = openai.ChatCompletion.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            text = resp.choices[0].message['content']
        
            if attempt == 3:
                raise
        
            return {"raw": text, "response": resp} 
        except Exception as e:
            time.sleep(2 ** attempt)

            
    raise RuntimeError("OpenAI calls failed after retries")