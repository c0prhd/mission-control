#!/usr/bin/env python3
"""
Log activity to Synth Mission Control dashboard.

Usage:
    python log_activity.py --agent crypto --action check --result success --asset BTC --freq high
    python log_activity.py --agent coordinator --status active --task "Working on task"
    python log_activity.py --mission "Optimize BTC sigma" --asset BTC --freq high --assignee crypto --priority high
    python log_activity.py --get-missions --agent crypto  # Get missions assigned to agent
    python log_activity.py --get-missions --mission-status assigned  # Get missions by status
"""

import argparse
import json
import urllib.request
import urllib.error

CONVEX_URL = "https://determined-goldfinch-126.convex.site"
API_KEY = "8c03d7f84ad885c3038b8ec7865bc2eedd4f62e54d20a5ce0a3033006d5abbd5"


def get_missions(agent_id: str = None, status: str = None):
    """Query missions from dashboard."""
    params = []
    if agent_id:
        params.append(f"agentId={agent_id}")
    if status:
        params.append(f"status={status}")

    query_string = "&".join(params) if params else ""
    url = f"{CONVEX_URL}/missions"
    if query_string:
        url = f"{url}?{query_string}"

    try:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {API_KEY}",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            missions = json.loads(response.read().decode("utf-8"))
        return missions
    except urllib.error.URLError as e:
        print(f"Warning: Failed to get missions: {e}")
        return []


def log_activity(
    agent_id: str,
    action: str,
    result: str,
    asset: str = None,
    frequency: str = None,
    details: str = None,
    gap_ratio: float = None,
    sigma_old: float = None,
    sigma_new: float = None,
):
    """Log activity to Convex HTTP endpoint."""
    payload = {
        "agentId": agent_id,
        "action": action,
        "result": result,
    }

    if asset:
        payload["asset"] = asset
    if frequency:
        payload["frequency"] = frequency
    if details:
        payload["details"] = details
    if gap_ratio is not None:
        payload["gapRatio"] = gap_ratio
    if sigma_old is not None:
        payload["sigmaOld"] = sigma_old
    if sigma_new is not None:
        payload["sigmaNew"] = sigma_new

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{CONVEX_URL}/log",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            response.read()
        print(f"Logged: {agent_id} {action} {result}")
        return True
    except urllib.error.URLError as e:
        print(f"Warning: Failed to log to dashboard: {e}")
        return False


def set_agent_status(agent_id: str, status: str, current_task: str = None):
    """Update agent status in dashboard."""
    payload = {
        "agentId": agent_id,
        "status": status,
    }
    if current_task:
        payload["currentTask"] = current_task

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{CONVEX_URL}/agent",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            response.read()
        print(f"Status: {agent_id} -> {status}")
        return True
    except urllib.error.URLError as e:
        print(f"Warning: Failed to update status: {e}")
        return False


def create_mission(
    title: str,
    description: str = None,
    asset: str = None,
    frequency: str = None,
    assignee: str = None,
    priority: str = "medium",
    tags: list = None,
    scheduled_for: int = None,
    status: str = None,
):
    """Create a mission (Kanban task) in the dashboard."""
    payload = {
        "title": title,
    }
    if description:
        payload["description"] = description
    if asset:
        payload["asset"] = asset
    if frequency:
        payload["frequency"] = frequency
    if assignee:
        payload["assignedTo"] = assignee
    if priority:
        payload["priority"] = priority
    if tags:
        payload["tags"] = tags
    if scheduled_for:
        payload["scheduledFor"] = scheduled_for
    if status:
        payload["status"] = status

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{CONVEX_URL}/mission",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
        assignee_str = f" -> {assignee}" if assignee else " (inbox)"
        print(f"Mission created: {title}" + assignee_str)
        return result.get("missionId")
    except urllib.error.URLError as e:
        print(f"Warning: Failed to create mission: {e}")
        return None


def update_mission_status(mission_id: str, status: str):
    """Update mission status (move in Kanban)."""
    payload = {
        "id": mission_id,
        "status": status,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{CONVEX_URL}/mission/status",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            response.read()
        print(f"Mission {mission_id} -> {status}")
        return True
    except urllib.error.URLError as e:
        print(f"Warning: Failed to update mission status: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Log activity to dashboard")
    parser.add_argument("--agent", help="Agent ID")
    parser.add_argument("--action", help="Action type (check, optimize, deploy, spawn, alert)")
    parser.add_argument("--result", help="Result (success, failure, skipped, pending)")
    parser.add_argument("--asset", help="Asset symbol")
    parser.add_argument("--freq", help="Frequency (high, low)")
    parser.add_argument("--details", help="Additional details")
    parser.add_argument("--gap", type=float, help="Gap ratio")
    parser.add_argument("--sigma-old", type=float, help="Old sigma value")
    parser.add_argument("--sigma-new", type=float, help="New sigma value")
    parser.add_argument("--status", help="Set agent status (online, active, idle, error)")
    parser.add_argument("--task", help="Current task description")

    # Mission arguments
    parser.add_argument("--mission", help="Create a mission with this title")
    parser.add_argument("--description", help="Mission description")
    parser.add_argument("--assignee", help="Agent to assign mission to")
    parser.add_argument("--priority", help="Mission priority (low, medium, high)")
    parser.add_argument("--tags", help="Comma-separated tags")
    parser.add_argument("--scheduled-for", type=int, help="Unix timestamp (ms) for scheduled run")
    parser.add_argument("--inbox", action="store_true", help="Create mission in inbox status")
    parser.add_argument("--mission-id", help="Mission ID for status updates")
    parser.add_argument("--mission-status", help="Update mission status (inbox, assigned, in_progress, review, done)")
    parser.add_argument("--get-missions", action="store_true", help="Query missions")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.get_missions:
        # Query missions
        missions = get_missions(agent_id=args.agent, status=args.mission_status)
        if args.json:
            print(json.dumps(missions, indent=2))
        else:
            if not missions:
                print("No missions found")
            else:
                for m in missions:
                    status_str = m.get("status", "unknown")
                    priority_marker = "[HIGH] " if m.get("priority") == "high" else ""
                    print(f"[{status_str}] {priority_marker}{m.get('title')} [{m.get('_id')}]")
                    if m.get("asset"):
                        print(f"   Asset: {m.get('asset')} {m.get('frequency', '')}")
    elif args.mission:
        tags = args.tags.split(",") if args.tags else None
        # Allow --mission-status to set initial status, or --inbox for inbox
        status = args.mission_status if args.mission_status else ("inbox" if args.inbox else None)
        create_mission(
            title=args.mission,
            description=args.description,
            asset=args.asset,
            frequency=args.freq,
            assignee=args.assignee,
            priority=args.priority or "medium",
            tags=tags,
            scheduled_for=args.scheduled_for,
            status=status,
        )
    elif args.mission_id and args.mission_status:
        update_mission_status(args.mission_id, args.mission_status)
    elif args.status:
        if not args.agent:
            print("Error: --agent is required with --status")
        else:
            set_agent_status(args.agent, args.status, args.task)
    elif args.action and args.result:
        if not args.agent:
            print("Error: --agent is required with --action")
        else:
            log_activity(
                agent_id=args.agent,
                action=args.action,
                result=args.result,
                asset=args.asset,
                frequency=args.freq,
                details=args.details,
                gap_ratio=args.gap,
                sigma_old=args.sigma_old,
                sigma_new=args.sigma_new,
            )
    else:
        print("Usage:")
        print("  Get missions:   --get-missions [--agent crypto] [--mission-status assigned]")
        print("  Create mission: --mission 'Title' [--asset BTC --freq high --assignee crypto --priority high]")
        print("  Update mission: --mission-id ID --mission-status in_progress")
        print("  Log activity:   --agent crypto --action check --result success")
        print("  Set status:     --agent crypto --status active")
