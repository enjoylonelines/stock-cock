#!/usr/bin/env python3
"""Run a versioned capacity ladder and summarize only repeated passing steps."""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BENCHMARK = Path(__file__).with_name("capacity_benchmark.py")


def parse_steps(raw):
    values = [int(value.strip()) for value in raw.split(",") if value.strip()]
    if not values or any(value <= 0 for value in values):
        raise ValueError("steps must be a comma-separated list of positive integers")
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["import", "http-read", "http-write", "mixed"], required=True)
    parser.add_argument("--steps", required=True, help="rows for import; active workflows for HTTP profiles")
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--chunk-size", type=int, default=100)
    parser.add_argument("--duration-seconds", type=int, default=120)
    parser.add_argument("--max-import-elapsed-seconds", type=int, default=60)
    parser.add_argument("--hot-key", action="store_true")
    parser.add_argument("--evidence-prefix", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.repeats <= 0 or args.chunk_size <= 0 or args.duration_seconds <= 0 or args.max_import_elapsed_seconds <= 0:
        raise SystemExit("all numeric inputs must be positive")
    output = Path(args.output)
    if output.exists():
        raise SystemExit(f"refusing to overwrite existing summary: {output}")

    steps = parse_steps(args.steps)
    prefix = Path(args.evidence_prefix)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    summary = {
        "status": "passed",
        "profile": args.profile,
        "axis": "rows" if args.profile == "import" else "concurrency",
        "steps": [],
        "highest_stable": None,
        "first_breach": None,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    for step in steps:
        runs = []
        for repeat in range(1, args.repeats + 1):
            evidence_path = Path(f"{prefix}-{args.profile}-step-{step}-repeat-{repeat}.json")
            command = [sys.executable, str(BENCHMARK), "--profile", args.profile, "--output", str(evidence_path)]
            if args.profile == "import":
                command.extend(["--rows", str(step), "--chunk-size", str(args.chunk_size), "--max-import-elapsed-seconds", str(args.max_import_elapsed_seconds)])
            else:
                command.extend(["--concurrency", str(step), "--duration-seconds", str(args.duration_seconds)])
            if args.hot_key:
                command.append("--hot-key")
            process = subprocess.run(command, text=True, capture_output=True)
            payload = json.loads(evidence_path.read_text()) if evidence_path.exists() else {"status": "failed", "error": "evidence_not_written"}
            runs.append(
                {
                    "repeat": repeat,
                    "status": payload.get("status"),
                    "evidence": str(evidence_path),
                    "measurement": payload.get("measurement"),
                    "reconciliation": payload.get("reconciliation"),
                    "error": payload.get("error"),
                    "runner_exit_code": process.returncode,
                }
            )
        passed = all(run["status"] == "passed" and run["runner_exit_code"] == 0 for run in runs)
        summary["steps"].append({"step": step, "passed": passed, "runs": runs})
        if not passed:
            summary["status"] = "first_breach_observed"
            summary["first_breach"] = step
            break
        summary["highest_stable"] = step
    if summary["first_breach"] is None:
        summary["no_breach_observed_within_tested_ceiling"] = True
    output.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"status": summary["status"], "output": str(output), "highest_stable": summary["highest_stable"], "first_breach": summary["first_breach"]}))
    raise SystemExit(0)


if __name__ == "__main__":
    main()
