from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[2]
BACKEND = Path(__file__).resolve().parents[1]


@dataclass
class StepResult:
    name: str
    status: str  # ok|fail|skip
    exit_code: int | None = None
    note: str = ""


def _now_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _run_step(name: str, args: list[str], *, env: dict[str, str] | None = None) -> StepResult:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    proc = subprocess.run(args, cwd=str(BACKEND), env=merged_env, capture_output=True, text=True)
    if proc.returncode == 0:
        return StepResult(name=name, status="ok", exit_code=0)
    # Keep output minimal in the JSON summary; details are still in stdout/stderr of the step.
    note = (proc.stderr or proc.stdout or "").strip().splitlines()[-1] if (proc.stderr or proc.stdout) else ""
    return StepResult(name=name, status="fail", exit_code=proc.returncode, note=note[:240])


def main() -> int:
    python = sys.executable
    run_id = _now_id()

    # Always run deterministic gates; optionally run Gemini gates if configured.
    steps: list[StepResult] = []

    steps.append(_run_step("smoke_day1_day3", [python, "scripts/smoke_day1_day3.py"]))
    steps.append(_run_step("smoke_edge_cases", [python, "scripts/smoke_edge_cases.py"]))

    steps.append(_run_step("eval_matrix_deterministic", [python, "scripts/run_eval_matrix.py"], env={"DATAREADY_DISABLE_LLM": "1"}))

    # Gemini readiness: require Vertex or API key, and ensure LLM not disabled.
    vertex_project = (os.getenv("DATAREADY_VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    llm_disabled = (os.getenv("DATAREADY_DISABLE_LLM") or "").strip().lower() in {"1", "true", "yes", "on"}

    if llm_disabled:
        steps.append(StepResult(name="eval_matrix_gemini", status="skip", note="DATAREADY_DISABLE_LLM is set."))
        steps.append(StepResult(name="external_sweep_gemini", status="skip", note="DATAREADY_DISABLE_LLM is set."))
        steps.append(StepResult(name="flagship_demo_gemini", status="skip", note="DATAREADY_DISABLE_LLM is set."))
    elif not (vertex_project or gemini_key):
        steps.append(StepResult(name="eval_matrix_gemini", status="skip", note="Gemini not configured (.env missing Vertex project or API key)."))
        steps.append(StepResult(name="external_sweep_gemini", status="skip", note="Gemini not configured (.env missing Vertex project or API key)."))
        steps.append(StepResult(name="flagship_demo_gemini", status="skip", note="Gemini not configured (.env missing Vertex project or API key)."))
    else:
        gemini_ping = _run_step("gemini_connectivity", [python, "scripts/check_gemini_connectivity.py"])
        steps.append(gemini_ping)
        if gemini_ping.status != "ok":
            steps.append(StepResult(name="eval_matrix_gemini", status="skip", note="Gemini connectivity failed."))
            steps.append(StepResult(name="external_sweep_gemini", status="skip", note="Gemini connectivity failed."))
            steps.append(StepResult(name="flagship_demo_gemini", status="skip", note="Gemini connectivity failed."))
        else:
            steps.append(_run_step("eval_matrix_gemini", [python, "scripts/run_eval_matrix.py"]))
            steps.append(_run_step("external_sweep_gemini", [python, "scripts/run_external_dataset_sweep.py"]))
            steps.append(_run_step("flagship_demo_gemini", [python, "scripts/run_flagship_demo.py"]))

    summary = {
        "run_id": run_id,
        "root": str(ROOT),
        "backend": str(BACKEND),
        "steps": [asdict(step) for step in steps],
        "ok": sum(1 for s in steps if s.status == "ok"),
        "fail": sum(1 for s in steps if s.status == "fail"),
        "skip": sum(1 for s in steps if s.status == "skip"),
    }

    out_dir = ROOT / "evals" / "local_runs"
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"ready_check_{run_id}.json"
        out_dir.joinpath("latest_ready_check.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    except PermissionError:
        pass

    print(json.dumps(summary, indent=2))
    return 0 if summary["fail"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
