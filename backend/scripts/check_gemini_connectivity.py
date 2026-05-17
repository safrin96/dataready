from __future__ import annotations

import concurrent.futures
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT.parent / ".env")


def main() -> int:
    if (os.getenv("DATAREADY_DISABLE_LLM") or "").strip().lower() in {"1", "true", "yes", "on"}:
        print("skip: DATAREADY_DISABLE_LLM is set")
        return 0

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip() or None
    vertex_project = (os.getenv("DATAREADY_VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip() or None
    vertex_location = (os.getenv("DATAREADY_VERTEX_LOCATION") or os.getenv("GOOGLE_CLOUD_LOCATION") or "us-central1").strip()
    if not (api_key or vertex_project):
        print("skip: Gemini not configured")
        return 0

    try:
        from google.genai import Client
        from google.genai import types
    except Exception as exc:  # noqa: BLE001
        print(f"fail: google-genai import failed: {type(exc).__name__}")
        return 1

    client = Client(vertexai=True, project=vertex_project, location=vertex_location) if vertex_project else Client(api_key=api_key)
    model = os.getenv("DATAREADY_WORKFLOW_MODEL", "gemini-2.5-flash")
    timeout_s = float(os.getenv("DATAREADY_GEMINI_PING_TIMEOUT_SECONDS", "10") or "10")

    def _call():
        return client.models.generate_content(
            model=model,
            contents='Return strict JSON only: {"status":"ok","component":"gemini"}',
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
            ),
        )

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_call)
    try:
        response = future.result(timeout=timeout_s)
    except concurrent.futures.TimeoutError:
        future.cancel()
        executor.shutdown(wait=False, cancel_futures=True)
        print(f"fail: Gemini ping timed out after {timeout_s:g}s")
        return 1
    except Exception as exc:  # noqa: BLE001
        executor.shutdown(wait=False, cancel_futures=True)
        message = str(exc).replace("\n", " ").strip()
        if len(message) > 220:
            message = message[:217] + "..."
        print(f"fail: Gemini ping failed: {type(exc).__name__}: {message}")
        return 1
    finally:
        if future.done():
            executor.shutdown(wait=False, cancel_futures=True)

    text = (getattr(response, "text", "") or "").strip()
    if '"status"' not in text or '"ok"' not in text:
        print("fail: Gemini ping returned unexpected content")
        return 1
    print(f"ok: Gemini ping succeeded with {model}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
