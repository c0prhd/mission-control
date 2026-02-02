#!/usr/bin/env python3
"""
Mission Cleanup Script
Resets stale missions that are stuck in 'in_progress' back to 'assigned'.
Also implements exponential backoff tracking for failed agent runs.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Config
STALE_THRESHOLD_MINUTES = 15
BACKOFF_FILE = Path.home() / '.clawdbot' / 'dashboard' / 'backoff_state.json'
MAX_BACKOFF_MINUTES = 60
INITIAL_BACKOFF_SECONDS = 30


def load_backoff_state():
    if BACKOFF_FILE.exists():
        try:
            with open(BACKOFF_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {'agents': {}, 'last_cleanup': None}


def save_backoff_state(state):
    BACKOFF_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(BACKOFF_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def get_missions():
    import subprocess
    script_path = Path.home() / '.clawdbot' / 'dashboard' / 'log_activity.py'
    result = subprocess.run(
        ['python3', str(script_path), '--get-missions', '--json'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        try:
            return json.loads(result.stdout)
        except Exception:
            pass
    return []


def update_mission_status(mission_id, status):
    import subprocess
    script_path = Path.home() / '.clawdbot' / 'dashboard' / 'log_activity.py'
    result = subprocess.run(
        ['python3', str(script_path),
         '--mission-id', mission_id, '--mission-status', status],
        capture_output=True, text=True
    )
    return result.returncode == 0


def cleanup_stale_missions():
    missions = get_missions()
    now_ms = time.time() * 1000  # Current time in milliseconds
    reset_count = 0

    for mission in missions:
        if mission.get('status') != 'in_progress':
            continue

        # updatedAt is Unix timestamp in milliseconds
        updated_at = mission.get('updatedAt')
        if updated_at:
            try:
                age_minutes = (now_ms - updated_at) / 1000 / 60

                if age_minutes > STALE_THRESHOLD_MINUTES:
                    mission_id = mission.get('_id')
                    mission_name = mission.get('title', 'Unknown')
                    print(f"Resetting stale mission: {mission_name} (stuck for {age_minutes:.0f} min)")

                    if update_mission_status(mission_id, 'assigned'):
                        reset_count += 1
                        print("  -> Reset to assigned")
                    else:
                        print("  -> Failed to reset")
            except Exception as e:
                print(f"Error processing mission: {e}")

    return reset_count


def should_run_agent(agent_name):
    state = load_backoff_state()
    agent_state = state.get('agents', {}).get(agent_name, {})

    consecutive_failures = agent_state.get('consecutive_failures', 0)
    last_failure_time = agent_state.get('last_failure_time')

    if consecutive_failures == 0:
        return True, 0

    backoff_seconds = min(
        INITIAL_BACKOFF_SECONDS * (2 ** (consecutive_failures - 1)),
        MAX_BACKOFF_MINUTES * 60
    )

    if last_failure_time:
        elapsed = time.time() - last_failure_time
        if elapsed < backoff_seconds:
            return False, backoff_seconds - elapsed

    return True, 0


def record_agent_result(agent_name, success):
    state = load_backoff_state()

    if 'agents' not in state:
        state['agents'] = {}

    if agent_name not in state['agents']:
        state['agents'][agent_name] = {'consecutive_failures': 0}

    if success:
        state['agents'][agent_name] = {
            'consecutive_failures': 0,
            'last_success_time': time.time()
        }
        print(f"Agent {agent_name}: Success - backoff reset")
    else:
        failures = state['agents'][agent_name].get('consecutive_failures', 0) + 1
        state['agents'][agent_name] = {
            'consecutive_failures': failures,
            'last_failure_time': time.time()
        }
        backoff = min(INITIAL_BACKOFF_SECONDS * (2 ** (failures - 1)), MAX_BACKOFF_MINUTES * 60)
        print(f"Agent {agent_name}: Failure #{failures} - next backoff {backoff}s")

    save_backoff_state(state)


def show_backoff_status():
    state = load_backoff_state()
    print("\n=== Agent Backoff Status ===")

    for agent_name, agent_state in state.get('agents', {}).items():
        failures = agent_state.get('consecutive_failures', 0)
        if failures > 0:
            backoff = min(INITIAL_BACKOFF_SECONDS * (2 ** (failures - 1)), MAX_BACKOFF_MINUTES * 60)
            last_fail = agent_state.get('last_failure_time', 0)
            elapsed = time.time() - last_fail if last_fail else 0
            remaining = max(0, backoff - elapsed)
            print(f"{agent_name}: {failures} failures, backoff {backoff}s, {remaining:.0f}s remaining")
        else:
            print(f"{agent_name}: OK (no recent failures)")
    
    if not state.get('agents'):
        print("No agent backoff data yet")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Mission cleanup and backoff management')
    parser.add_argument('--cleanup', action='store_true', help='Clean up stale missions')
    parser.add_argument('--check-agent', type=str, help='Check if agent should run')
    parser.add_argument('--record-success', type=str, help='Record successful agent run')
    parser.add_argument('--record-failure', type=str, help='Record failed agent run')
    parser.add_argument('--status', action='store_true', help='Show backoff status')
    parser.add_argument('--reset-backoff', type=str, help='Reset backoff for an agent')

    args = parser.parse_args()

    if args.cleanup:
        print(f"Checking for missions stuck in in_progress > {STALE_THRESHOLD_MINUTES} min...")
        reset_count = cleanup_stale_missions()
        print(f"Reset {reset_count} stale mission(s)")

    elif args.check_agent:
        should_run, wait_time = should_run_agent(args.check_agent)
        if should_run:
            print("RUN")
            sys.exit(0)
        else:
            print(f"WAIT {wait_time:.0f}s")
            sys.exit(1)

    elif args.record_success:
        record_agent_result(args.record_success, True)

    elif args.record_failure:
        record_agent_result(args.record_failure, False)

    elif args.status:
        show_backoff_status()

    elif args.reset_backoff:
        state = load_backoff_state()
        if args.reset_backoff in state.get('agents', {}):
            state['agents'][args.reset_backoff] = {'consecutive_failures': 0}
            save_backoff_state(state)
            print(f"Reset backoff for {args.reset_backoff}")
        else:
            print(f"No backoff state for {args.reset_backoff}")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
