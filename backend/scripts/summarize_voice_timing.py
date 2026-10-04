#!/usr/bin/env python3
"""
backend/scripts/summarize_voice_timing.py

Parses and summarizes [VoiceTiming] logs from real telephony / LiveKit agent calls.
Outputs a per-stage latency breakdown table.
Strictly distinguishes MEASURED values from NOT YET MEASURED stages.
"""

import sys
import re
import argparse
from typing import Dict, List, Optional


STAGE_DESCRIPTIONS = {
    "answer": "Telephony SIP / WebRTC Answer",
    "session_start": "LiveKit Room Connected & Session Initialized",
    "config_load": "Agent Database Config Loaded",
    "lookup": "Prospect / Contact Pre-Lookup",
    "disclosure_composed": "Statutory AI & Recording Greeting Composed",
    "first_tts_byte": "TTS Stream Initialized / First Byte",
    "user_speech_end": "Caller Finished Speaking (VAD Endpoint)",
    "stt_final": "Speech-to-Text Transcription Finalized",
    "llm_first_token": "LLM Inference First Token Emitted",
    "tool_start": "Tool Call Dispatched (Appointment / DB)",
    "tool_end": "Tool Call Completed",
    "tts_first_byte": "TTS First Byte for Assistant Turn",
    "audio_playout": "Audio Playout Started via WebRTC",
}

LOG_PATTERN = re.compile(
    r"\[VoiceTiming\]\s+room=(?P<room>\S+)\s+turn=(?P<turn>\d+)\s+stage=(?P<stage>\w+)\s+elapsed_ms=(?P<elapsed>[\d\.]+)(?:\s+\|\s+(?P<extra>.*))?"
)


def parse_timing_lines(lines: List[str]) -> Dict[str, Dict[str, Optional[float]]]:
    """Parse log lines and group metrics by room and turn."""
    sessions: Dict[str, Dict[str, Optional[float]]] = {}

    for line in lines:
        match = LOG_PATTERN.search(line)
        if match:
            room = match.group("room")
            turn = match.group("turn")
            stage = match.group("stage")
            elapsed = float(match.group("elapsed"))

            session_key = f"room:{room}_turn:{turn}"
            if session_key not in sessions:
                sessions[session_key] = {s: None for s in STAGE_DESCRIPTIONS}

            sessions[session_key][stage] = elapsed

    return sessions


def print_summary_table(sessions: Dict[str, Dict[str, Optional[float]]]):
    """Print markdown and terminal summary tables."""
    if not sessions:
        print("\n[VoiceTiming Summary] No [VoiceTiming] log lines found in input.")
        print("Status: NOT YET MEASURED (Awaiting live call log)\n")
        return

    for session_key, stages in sessions.items():
        print(f"\n==================================================================")
        print(f" Voice Pipeline Latency Summary: {session_key}")
        print(f"==================================================================")
        print(f"| {'Stage Name':<22} | {'Description':<42} | {'Elapsed (ms)':<14} |")
        print(f"|------------------------|--------------------------------------------|----------------|")

        measured_count = 0
        total_ms = 0.0

        for stage, desc in STAGE_DESCRIPTIONS.items():
            val = stages.get(stage)
            if val is not None:
                measured_count += 1
                total_ms += val
                print(f"| {stage:<22} | {desc:<42} | {val:>10.1f} ms  |")
            else:
                print(f"| {stage:<22} | {desc:<42} | NOT YET MEASURED|")

        print(f"|------------------------|--------------------------------------------|----------------|")
        print(f"| {'TOTAL MEASURED':<22} | {'Across observed stages':<42} | {total_ms:>10.1f} ms  |")
        print(f"==================================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Summarize [VoiceTiming] logs from live calls.")
    parser.add_argument("logfile", nargs="?", help="Path to log file (or reads stdin if omitted)")
    args = parser.parse_args()

    lines = []
    if args.logfile:
        try:
            with open(args.logfile, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception as e:
            print(f"Error reading file '{args.logfile}': {e}", file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        lines = sys.stdin.readlines()
    else:
        print("Usage: python backend/scripts/summarize_voice_timing.py <call_log.txt> OR pipe logs via stdin.")
        sys.exit(0)

    sessions = parse_timing_lines(lines)
    print_summary_table(sessions)


if __name__ == "__main__":
    main()
