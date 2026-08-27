import json
import re
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings

CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
]

def get_gemini_client() -> Optional[genai.Client]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")
        return None

def generate_llm_content(
    prompt: str,
    system_instruction: Optional[str] = None,
    json_output: bool = False,
    temperature: float = 0.2
) -> Optional[str]:
    client = get_gemini_client()
    if not client:
        return None

    config_args: Dict[str, Any] = {"temperature": temperature}
    if system_instruction:
        config_args["system_instruction"] = system_instruction
    if json_output:
        config_args["response_mime_type"] = "application/json"

    config = types.GenerateContentConfig(**config_args)

    for model in CANDIDATE_MODELS:
        try:
            res = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            if res and res.text:
                return res.text
        except Exception as e:
            print(f"Gemini LLM model '{model}' call failed: {e}")
            continue

    return None

def parse_json_from_llm(raw_text: str) -> Optional[Any]:
    if not raw_text:
        return None
    try:
        return json.loads(raw_text)
    except Exception:
        # Try regex extraction for json code blocks ```json ... ```
        match = re.search(r'```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```', raw_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        # Try raw bracket search
        start_brace = raw_text.find('{')
        end_brace = raw_text.rfind('}')
        if start_brace != -1 and end_brace > start_brace:
            try:
                return json.loads(raw_text[start_brace:end_brace+1])
            except Exception:
                pass
    return None
