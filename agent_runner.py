#!/usr/bin/env python3
"""
Agent Runner - Investigation-Focused Workflow

Agents investigate performance issues rather than optimize directly.
The batch file (optimize_and_deploy.bat) handles all optimization.

Agents:
- Run backtests with diagnostics
- Analyze patterns (temporal, regime, sigma accuracy)
- Build knowledge in MEMORY.md
- Report findings back to coordinator

IMPORTANT: Score Delays
- HIGH frequency: Ranks reflect predictions from 1-6 hours ago
- LOW frequency: Ranks reflect predictions from 24-48 hours ago
Don't expect immediate rank improvement after parameter changes!
"""
import subprocess
import json
import sys
import os
import re
from datetime import datetime, timezone
from pathlib import Path

CONVEX_URL = "https://determined-goldfinch-126.convex.cloud"
SYNTH_DIR = "/mnt/bittensor-synth"
LOG_ACTIVITY = os.path.expanduser("~/.clawdbot/dashboard/log_activity.py")
WORKSPACES_DIR = Path.home() / ".clawdbot" / "workspaces"

# Score delay awareness
SCORE_DELAYS = {
    "high": "1-6 hours (6-hour scoring window)",
    "low": "24-48 hours (24-hour horizon + scoring window)"
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def run_cmd(cmd, cwd=None, timeout=600):
    """Run a command and return output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd, timeout=timeout)
        return result.stdout.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "Timeout", 1
    except Exception as e:
        return str(e), 1

def get_missions(agent_id):
    """Get missions assigned to an agent."""
    output, _ = run_cmd(f"python3 {LOG_ACTIVITY} --get-missions --agent {agent_id}")
    missions = []
    for line in output.split('\n'):
        if '[assigned]' in line.lower():
            id_match = re.search(r'\[([a-z0-9]+)\]$', line.strip())
            if id_match:
                mission_id = id_match.group(1)
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

def create_finding_card(agent_id, findings):
    """Create a finding card in the review column for human review."""
    asset = findings.get("asset", "?")
    freq = findings.get("freq", "?")
    analysis = findings.get("analysis", {})

    # Determine if this finding is notable enough to create a card
    sigma_ratio = analysis.get("sigma_ratio")
    gap_ratio = analysis.get("gap_ratio")
    crps = analysis.get("crps")
    backtest_crps = analysis.get("backtest_crps")
    error_pct = analysis.get("error_pct")

    # Build assessment
    issues = []
    severity = "medium"

    if sigma_ratio:
        if sigma_ratio < 0.7:
            issues.append(f"UNDER-predicting by {(1-sigma_ratio)*100:.0f}%")
            severity = "high"
        elif sigma_ratio < 0.85:
            issues.append(f"Under-predicting by {(1-sigma_ratio)*100:.0f}%")
        elif sigma_ratio > 1.3:
            issues.append(f"OVER-predicting by {(sigma_ratio-1)*100:.0f}%")
            severity = "high"
        elif sigma_ratio > 1.15:
            issues.append(f"Over-predicting by {(sigma_ratio-1)*100:.0f}%")

    if gap_ratio:
        if gap_ratio > 2.0:
            issues.append(f"Gap ratio {gap_ratio:.2f} (CRITICAL)")
            severity = "high"
        elif gap_ratio > 1.5:
            issues.append(f"Gap ratio {gap_ratio:.2f} (poor)")
        elif gap_ratio > 1.2:
            issues.append(f"Gap ratio {gap_ratio:.2f} (needs work)")

    # Check if actual CRPS is much worse than backtest potential
    if crps and backtest_crps and crps > backtest_crps * 1.5:
        gap_from_potential = crps / backtest_crps
        issues.append(f"Actual CRPS {gap_from_potential:.1f}x worse than backtest")
        if gap_from_potential > 2.0:
            severity = "high"

    # Only create card if there are notable issues
    if not issues:
        log(f"  No notable issues for {asset} {freq} - skipping review card")
        return False

    # Build title and description
    title = f"🔍 {asset} {freq.upper()}: {issues[0]}"

    description_lines = [
        f"Investigation by {agent_id} agent",
        f"Score Delay: {findings.get('score_delay', 'unknown')}",
        "",
        "Findings:",
    ]
    for issue in issues:
        description_lines.append(f"- {issue}")

    description_lines.append("")
    description_lines.append("Metrics:")
    if sigma_ratio:
        description_lines.append(f"- Sigma Ratio: {sigma_ratio:.3f}")
    if crps:
        description_lines.append(f"- Actual CRPS: {crps:.2f}")
    if backtest_crps:
        description_lines.append(f"- Backtest CRPS: {backtest_crps:.2f}")
    if error_pct:
        description_lines.append(f"- Error: {error_pct:.1f}%")
    if gap_ratio:
        description_lines.append(f"- Gap Ratio: {gap_ratio:.3f}")

    description = " | ".join(description_lines)

    # Create the mission in review status
    # Use shell escaping for title
    title_escaped = title.replace("'", "'\\''")
    cmd = f"python3 {LOG_ACTIVITY} --mission '{title_escaped}' --asset {asset} --freq {freq} --priority {severity} --mission-status review --tags finding,investigate"

    output, code = run_cmd(cmd)
    if code == 0:
        log(f"  Created finding card in review: {title[:50]}...")
        return True
    else:
        log(f"  Failed to create finding card: {output}")
        return False

def parse_mission_title(title):
    """Parse mission title to extract asset and frequency."""
    # Format: "BTC HIGH: gap 1.186" or "Investigate SPYX performance"
    parts = title.split(':')[0].strip().split()

    # Try to find asset and frequency
    assets = ["BTC", "ETH", "SOL", "XAU", "SPYX", "NVDAX", "TSLAX", "AAPLX", "GOOGLX"]
    freqs = ["high", "low"]

    asset = None
    freq = None

    for part in parts:
        upper = part.upper()
        if upper in assets:
            asset = upper
        if part.lower() in freqs:
            freq = part.lower()

    return asset, freq

def run_investigation(asset, freq, hours=24):
    """
    Run backtest investigation for an asset.
    Returns findings dict with analysis results.
    """
    log(f"  Running investigation for {asset} {freq} (last {hours}h)...")

    # Run backtest with diagnostics
    cmd = f"cd {SYNTH_DIR} && source venv/bin/activate && python backtest_models.py --asset {asset} --freq {freq} --hours {hours} --diagnostics 2>&1"
    output, code = run_cmd(f"bash -c '{cmd}'", timeout=600)

    findings = {
        "asset": asset,
        "freq": freq,
        "hours": hours,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "score_delay": SCORE_DELAYS.get(freq, "unknown"),
        "raw_output": output[:2000] if output else "No output",
        "analysis": {}
    }

    if code != 0:
        findings["status"] = "error"
        findings["error"] = output[:500]
        return findings

    findings["status"] = "success"

    # Parse key metrics from output
    try:
        # Look for sigma ratio - format: "Sigma Ratio:       0.43 (bias: -56.6%)"
        sigma_match = re.search(r'Sigma\s+Ratio:\s+([0-9.]+)', output)
        if sigma_match:
            findings["analysis"]["sigma_ratio"] = float(sigma_match.group(1))

        # Look for CRPS - format: "Avg Actual CRPS:   1647.97" or "Avg Backtest CRPS: 824.05"
        # Use actual CRPS (what we're getting on the network)
        crps_match = re.search(r'Avg Actual CRPS:\s+([0-9.]+)', output)
        if crps_match:
            findings["analysis"]["crps"] = float(crps_match.group(1))

        # Look for backtest CRPS (what we could achieve)
        backtest_crps_match = re.search(r'Avg Backtest CRPS:\s+([0-9.]+)', output)
        if backtest_crps_match:
            findings["analysis"]["backtest_crps"] = float(backtest_crps_match.group(1))

        # Look for error percentage
        error_match = re.search(r'Avg Error:\s+([0-9.]+)%', output)
        if error_match:
            findings["analysis"]["error_pct"] = float(error_match.group(1))

        # Look for gap ratio in output if present
        gap_match = re.search(r'gap[_\s]?ratio[:\s]+([0-9.]+)', output, re.IGNORECASE)
        if gap_match:
            findings["analysis"]["gap_ratio"] = float(gap_match.group(1))

    except Exception as e:
        findings["parse_error"] = str(e)

    return findings

def append_to_memory(agent_id, finding_text):
    """Append a finding to the agent's MEMORY.md file."""
    memory_path = WORKSPACES_DIR / agent_id / "MEMORY.md"

    if not memory_path.exists():
        log(f"  Warning: MEMORY.md not found for {agent_id}")
        return False

    try:
        with open(memory_path, "a") as f:
            f.write(f"\n\n---\n\n")
            f.write(f"## Investigation Finding ({datetime.now().strftime('%Y-%m-%d %H:%M UTC')})\n\n")
            f.write(finding_text)
        return True
    except Exception as e:
        log(f"  Error writing to MEMORY.md: {e}")
        return False

def format_finding(findings):
    """Format investigation findings for MEMORY.md."""
    asset = findings.get("asset", "?")
    freq = findings.get("freq", "?")

    text = f"### {asset} {freq.upper()} Investigation\n\n"
    text += f"**Score Delay Note:** {findings.get('score_delay', 'unknown')}\n\n"

    if findings.get("status") == "error":
        text += f"**Status:** Error\n"
        text += f"**Error:** {findings.get('error', 'Unknown error')}\n"
        return text

    analysis = findings.get("analysis", {})

    if analysis.get("sigma_ratio"):
        ratio = analysis["sigma_ratio"]
        if ratio < 0.85:
            assessment = f"UNDER-predicting by {(1-ratio)*100:.0f}%"
        elif ratio > 1.15:
            assessment = f"OVER-predicting by {(ratio-1)*100:.0f}%"
        else:
            assessment = "Within acceptable range"
        text += f"**Sigma Ratio:** {ratio:.3f} ({assessment})\n"

    if analysis.get("crps"):
        text += f"**CRPS:** {analysis['crps']:.2f}\n"

    if analysis.get("gap_ratio"):
        gap = analysis["gap_ratio"]
        if gap > 1.5:
            assessment = "CRITICAL - significantly worse than competition"
        elif gap > 1.2:
            assessment = "Needs improvement"
        else:
            assessment = "Acceptable"
        text += f"**Gap Ratio:** {gap:.3f} ({assessment})\n"

    text += f"\n**Raw Output (truncated):**\n```\n{findings.get('raw_output', 'N/A')[:500]}\n```\n"

    return text

def process_investigation_mission(agent_id, mission, valid_assets):
    """Process a single investigation mission."""
    mission_id = mission["id"]
    title = mission["title"]
    asset, freq = parse_mission_title(title)

    if not asset or asset not in valid_assets:
        log(f"  Skipping mission not for this agent: {title}")
        return False

    if not freq:
        freq = "high" if asset in ["BTC", "ETH", "SOL", "XAU"] else "low"

    log(f"  Investigating: {asset} {freq}")
    update_mission_status(mission_id, "in_progress")

    # Run investigation
    hours = 24 if freq == "high" else 48
    findings = run_investigation(asset, freq, hours)

    # Log activity
    result = "success" if findings.get("status") == "success" else "failure"
    details = f"sigma_ratio={findings.get('analysis', {}).get('sigma_ratio', '?')}"
    log_activity(agent_id, "investigate", result, asset, freq, details)

    # Save findings to MEMORY.md
    finding_text = format_finding(findings)
    if append_to_memory(agent_id, finding_text):
        log(f"  Finding saved to MEMORY.md")

    # Create finding card in review column for human review
    if findings.get("status") == "success":
        create_finding_card(agent_id, findings)

    # Mark original mission done
    update_mission_status(mission_id, "done")
    log(f"  Completed investigation: {asset} {freq}")

    return True

def process_crypto_missions():
    """Process investigation missions for crypto agent."""
    agent_id = "crypto"
    valid_assets = ["BTC", "ETH", "SOL"]
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Investigating {len(missions)} issues")

    processed = 0
    for mission in missions[:2]:  # Max 2 investigations per run
        if process_investigation_mission(agent_id, mission, valid_assets):
            processed += 1

    if processed > 0:
        log(f"  Completed {processed} investigations")

    update_agent_status(agent_id, "idle")

def process_gold_missions():
    """Process investigation missions for gold agent."""
    agent_id = "gold"
    valid_assets = ["XAU"]
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Investigating {len(missions)} issues")

    for mission in missions[:2]:
        process_investigation_mission(agent_id, mission, valid_assets)

    update_agent_status(agent_id, "idle")

def process_equities_missions():
    """Process investigation missions for equities agent."""
    agent_id = "equities"
    valid_assets = ["SPYX", "NVDAX", "TSLAX", "AAPLX", "GOOGLX"]
    missions = get_missions(agent_id)

    if not missions:
        log(f"No missions for {agent_id}")
        return

    log(f"Found {len(missions)} missions for {agent_id}")
    update_agent_status(agent_id, "active", f"Investigating {len(missions)} issues")

    # Prioritize by coefficient
    priority_order = ["SPYX", "AAPLX", "GOOGLX", "TSLAX", "NVDAX"]

    # Sort missions by priority
    def get_priority(m):
        asset, _ = parse_mission_title(m["title"])
        try:
            return priority_order.index(asset) if asset in priority_order else 99
        except:
            return 99

    sorted_missions = sorted(missions, key=get_priority)

    for mission in sorted_missions[:3]:  # Max 3 per run
        process_investigation_mission(agent_id, mission, valid_assets)

    update_agent_status(agent_id, "idle")

def main():
    log("=" * 60)
    log("Agent Runner (Investigation Mode)")
    log("=" * 60)
    log("")
    log("SCORE DELAY REMINDER:")
    log(f"  HIGH frequency: {SCORE_DELAYS['high']}")
    log(f"  LOW frequency:  {SCORE_DELAYS['low']}")
    log("  Don't expect immediate rank improvement after changes!")
    log("")

    # Process each agent's missions
    process_crypto_missions()
    process_gold_missions()
    process_equities_missions()

    log("")
    log("Agent Runner complete")
    log("=" * 60)

if __name__ == "__main__":
    main()
