#!/usr/bin/env python3
"""
Comprueba qué modelos Gemini tienen cuota disponible en tu API key (free tier).
Hace una petición mínima por modelo; 429 = sin cuota (limit 0 o agotada).

Uso:
  uv run python scripts/check_gemini_models.py
  # GEMINI_API_KEY en .env o entorno
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from dotenv import load_dotenv

load_dotenv()

# Modelos de texto (generateContent), sin imagen/tts/robotics
TEXT_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.5-flash-lite-preview-09-2025",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
    "gemini-exp-1206",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemma-3-1b-it",
    "gemma-3-4b-it",
    "gemma-3-12b-it",
    "gemma-3-27b-it",
    "gemma-3n-e4b-it",
    "gemma-3n-e2b-it",
]


def main() -> None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY no configurado. Agrégala a .env o al entorno.")
        sys.exit(1)

    from google import genai
    from google.genai import types
    from google.genai.errors import ClientError

    client = genai.Client(api_key=api_key)
    usable = []
    not_usable = []

    print("Comprobando cuota por modelo (1 petición mínima por modelo)...\n")

    for i, model in enumerate(TEXT_MODELS):
        try:
            response = client.models.generate_content(
                model=model,
                contents="Di solo: OK",
                config=types.GenerateContentConfig(max_output_tokens=10),
            )
            _ = getattr(response, "text", None) or ""
            usable.append(model)
            print(f"  [OK] {model}")
        except ClientError as e:
            not_usable.append(model)
            err_str = str(e).upper()
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "QUOTA" in err_str:
                print(f"  [429] {model}  (sin cuota free tier o límite agotado)")
            else:
                print(f"  [err] {model}  ({str(e)[:55]}...)")
        except Exception as e:
            not_usable.append(model)
            err_str = str(e).upper()
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "QUOTA" in err_str:
                print(f"  [429] {model}  (sin cuota free tier o límite agotado)")
            else:
                print(f"  [--] {model}  ({type(e).__name__}: {str(e)[:50]})")
        if i < len(TEXT_MODELS) - 1:
            time.sleep(1.2)

    print("\n" + "=" * 50)
    print("USABLES (puedes ponerlos en GEMINI_MODEL):")
    for m in usable:
        print(f"  {m}")
    print("\nSIN CUOTA / NO DISPONIBLES (429 o error):")
    for m in not_usable:
        print(f"  {m}")


if __name__ == "__main__":
    main()
