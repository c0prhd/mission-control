#!/usr/bin/env python3
"""
Agent Runner - Checks for assigned missions and processes them automatically.
Run via cron every 15 minutes to keep agents working on tasks.
"""
import subprocess
import json
import sys
import os
from datetime import datetime

CONVEX_URL = "https://determined-goldfinch-126.convex.cloud"
SYNTH_DIR = "/mnt/bittensor-synth"
LOG_ACTIVITY = os.path.expanduser("~/.clawdbot/dashboard/log_activity.py")

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def run_cmd(cmd, cwd=None):
    """Run a command and return output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd, timeout=300)
        return result.stdout.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "Timeout", 1
    except Exception as e:
        return str(e), 1

def get_missions(agent_id):
    """Get missions assigned to an agent."""
    output, _ = run_cmd(f"python3 {LOG_ACTIVITY} --get-missions --agent {agent_id}")
    # Parse output format: [assigned] [HIGH] SOL HIGH: gap 1.277 [js760d3qwjxt22bn9hqwps5m5n80dkgy]
    missions = []
    for line in output.split('\n'):
        if '[assigned]' in line.lower():
            # Extract mission ID from brackets at end
            import re
            id_match = re.search(r'\[([a-z0-9]+)\]$', line.strip())
            if id_match:
                mission_id = id_match.group(1)
                # Extract title (between status and ID)
                title_match = re.search(r'\[assigned\](?:\s*\[[^\]]+\])?\s*(.+?)\s*\[[a-z0-9]+\]$', line, re.IGNORECASE)
                title = title_match.group(1).strip() if title_match else ""
                missions.append({"id": mission_id, "title": title})
    return missions

def update_mission_status(mission_id, status):
    """Update mission status."""
    run_cmd(f"python3 {LOG_ACTIVITY} --mission-id {mission_id} --mission-status {status}")

def update_agent_status(agent_id, status, task=""):
    """Update agent status."""
    cmd = f"python3 {LOG_ACTIVITY} --agent {agent_id} --status {status}"
    if task:
        cmd += f' --task "{task}"'
    run_cmd(cmd)

def log_activity(agent_id, action, result, asset=None, freq=None, details=None):
    """Log agent activity."""
    cmd = f"python3 {LOG_ACTIVITY} --agent {agent_id} --action {action} --result {result}"
    if asset:
        cmd += f" --asset {asset}"
    if freq:
        cmd += f" --freq {freq}"
    if details:
        cmd += f' --details "{details}"'
    run_cmd(cmd)

def parse_mission_title(title):
    """Parse mission title to extract asset and frequency."""
    # Format: "BTC HIGH: gap 1.186" or "SPYX LOW: gap 1.701"
    parts = title.split(':')[0].strip().split()
    if len(parts) >= 2:
        asset = parts[0]
        freq = parts[1].lower()
        return asset, freq
    return None, None

def run_optimization(asset, freq):
    """Run sigma optimization for an asset."""
    log(f"  Running optimization for {asset} {freq}...")
    cmd = f"cd {SYNTH_DIR} && source venv/bin/activate && python optimize_sigma_locally.py --asset {asset} --prompt-type {freq} --windows 3 --apply"
    output, code = run_cmd(f"bash -c '{cmd}'")

    if code == 0 and "Improvement" in output:
        # Parse improvement percentage
        for line in output.split('\n'):
            if "Improvement" in line:
                log(f"  {line}")
        return "success", output
    elif code == 0:
        return "success", "No improvement found"
    else:
        return "failure", output

def deploy_params():
    """Deploy updated params to miners."""
    log("  Deploying params to miners...")
    cmd = f"cd {SYNTH_DIR} && python deploy_utils.py --deploy-params"
    output, code = run_cmd(cmd)
    return code == 0

def process_crypto_missions():
    """Process missions for crypto agent."""
    agent_id = "crypto"
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Processing {len(missions)} missions")

    for mission in missions[:3]:  # Process max 3 per run
        mission_id = mission["id"]
        title = mission["title"]
        asset, freq = parse_mission_title(title)

        if not asset or asset not in ["BTC", "ETH", "SOL"]:
            log(f"  Skipping non-crypto mission: {title}")
            continue

        log(f"  Working on: {title}")
        update_mission_status(mission_id, "in_progress")

        result, details = run_optimization(asset, freq)
        log_activity(agent_id, "optimize", result, asset, freq, details[:100] if details else None)

        if result == "success":
            update_mission_status(mission_id, "done")
            log(f"  Completed: {title}")
        else:
            log(f"  Failed: {title} - {details[:100]}")
            # Leave in_progress for retry

    deploy_params()
    update_agent_status(agent_id, "idle")

def process_gold_missions():
    """Process missions for gold agent."""
    agent_id = "gold"
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Processing {len(missions)} missions")

    for mission in missions[:2]:
        mission_id = mission["id"]
        title = mission["title"]
        asset, freq = parse_mission_title(title)

        if asset != "XAU":
            log(f"  Skipping non-gold mission: {title}")
            continue

        log(f"  Working on: {title}")
        update_mission_status(mission_id, "in_progress")

        result, details = run_optimization(asset, freq)
        log_activity(agent_id, "optimize", result, asset, freq, details[:100] if details else None)

        if result == "success":
            update_mission_status(mission_id, "done")

    deploy_params()
    update_agent_status(agent_id, "idle")

def process_equities_missions():
    """Process missions for equities agent."""
    agent_id = "equities"
    equities_assets = ["SPYX", "NVDAX", "TSLAX", "AAPLX", "GOOGLX"]
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Processing {len(missions)} missions")

    for mission in missions[:3]:
        mission_id = mission["id"]
        title = mission["title"]
        asset, freq = parse_mission_title(title)

        if asset not in equities_assets:
            log(f"  Skipping non-equities mission: {title}")
            continue

        log(f"  Working on: {title}")
        update_mission_status(mission_id, "in_progress")

        result, details = run_optimization(asset, freq)
        log_activity(agent_id, "optimize", result, asset, freq, details[:100] if details else None)

        if result == "success":
            update_mission_status(mission_id, "done")

    deploy_params()
    update_agent_status(agent_id, "idle")

def main():
    log("=" * 50)
    log("Agent Runner starting...")

    # Process each agent's missions
    process_crypto_missions()
    process_gold_missions()
    process_equities_missions()

    log("Agent Runner complete")
    log("=" * 50)

if __name__ == "__main__":
    main()
