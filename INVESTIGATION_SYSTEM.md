# Investigation System Documentation

**Last Updated:** 2026-02-02

## Overview

The Investigation System is a zero-LLM-token automated pipeline for monitoring and analyzing miner performance on the Synth subnet. It uses a Kanban-style dashboard to track issues, coordinate specialist "agents" (Python scripts), and surface findings for human review.

**Key Design Principle:** No LLM tokens are used during operation. All "agents" are deterministic Python scripts that run backtests, parse numerical output, and format findings using string templates.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INVESTIGATION HQ                              │
│                    http://localhost:3000                             │
├─────────────────────────────────────────────────────────────────────┤
│  ISSUES       ASSIGNED      INVESTIGATING    FINDINGS    ARCHIVED   │
│  DETECTED                                                            │
│  ┌─────┐      ┌─────┐       ┌─────┐         ┌─────┐     ┌─────┐    │
│  │Card │ ──►  │Card │  ──►  │Card │  ──►    │Card │ ──► │Card │    │
│  └─────┘      └─────┘       └─────┘         └─────┘     └─────┘    │
│                  │              │               │                    │
│            agent_runner.py  backtest      create_finding_card()     │
│            picks up         running       if notable issues         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CRON JOBS                                    │
│                                                                      │
│  */15 * * * *  agent_runner.py      # Process assigned missions     │
│  */5  * * * *  fix_scheduled.mjs    # Set countdown timers          │
│  */30 * * * *  optimize_and_deploy  # Sigma optimization (separate) │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Dashboard (React + Convex)

**Location:** `~/.clawdbot/dashboard/`
**URL:** `http://localhost:3000`
**Service:** `systemctl --user status mission-control`

The dashboard displays:
- **Header:** "INVESTIGATION HQ" with agent count, investigation count, score delays
- **Sidebar:** Agent status (online/active/idle)
- **Board:** Kanban columns for mission workflow
- **Live Feed:** Activity log

**Columns:**
| Column | Status ID | Description |
|--------|-----------|-------------|
| ISSUES DETECTED | `inbox` | Problems identified by coordinator |
| ASSIGNED | `assigned` | Waiting for specialist agent |
| INVESTIGATING | `in_progress` | Agent running backtest analysis |
| FINDINGS | `review` | Investigation complete, needs human review |
| ARCHIVED | `done` | Knowledge captured |

### 2. Agent Runner

**Location:** `~/.clawdbot/dashboard/agent_runner.py`
**Schedule:** Every 15 minutes via cron
**Log:** `~/.clawdbot/agent_runner.log`

The agent runner:
1. Queries missions assigned to each agent (crypto, gold, equities)
2. Filters missions to ensure correct asset-to-agent mapping
3. Runs `backtest_models.py --diagnostics` for each mission
4. Parses output for: sigma_ratio, actual CRPS, backtest CRPS, error%
5. Creates finding cards in FINDINGS column if notable issues detected
6. Saves detailed findings to agent's `MEMORY.md`
7. Updates mission status to `done`

**Agents and Their Assets:**
| Agent | Assets | Max Missions/Run |
|-------|--------|------------------|
| crypto | BTC, ETH, SOL | 2 |
| gold | XAU | 2 |
| equities | SPYX, NVDAX, TSLAX, AAPLX, GOOGLX | 3 |

### 3. Backtest System

**Location:** `/mnt/bittensor-synth/backtest_models.py`
**Runtime:** ~3-4 minutes per asset

The backtest:
1. Fetches historical scores from leaderboard API
2. Reconstructs prediction scenarios using Pyth price data
3. Runs simulations with current model parameters
4. Calculates CRPS using validator-style scoring
5. Outputs diagnostics including sigma_ratio

### 4. Finding Card Creation

Finding cards are created in the FINDINGS column when investigations discover:
- **Sigma ratio < 0.85:** Under-predicting volatility
- **Sigma ratio > 1.15:** Over-predicting volatility
- **Gap ratio > 1.2:** Performing worse than competition
- **Actual CRPS > 1.5x backtest CRPS:** Live performance worse than potential

Cards include:
- Issue summary in title
- Metrics (sigma ratio, CRPS, gap ratio)
- Score delay reminder
- "✓ Archive" button for human review

---

## Mission Workflow

### Lifecycle

```
1. ISSUE DETECTED
   └── Coordinator or monitoring creates mission in inbox

2. ASSIGNED
   └── Mission assigned to specialist agent (crypto/gold/equities)

3. INVESTIGATING
   └── agent_runner.py picks up mission
   └── Runs: backtest_models.py --asset X --freq Y --diagnostics
   └── Takes 3-4 minutes per investigation

4. FINDINGS (if notable issues)
   └── New card created with investigation results
   └── Human reviews and clicks "✓ Archive"

5. ARCHIVED
   └── Knowledge captured, mission complete
```

### Score Delay Awareness

**Critical:** Ranks do not reflect recent changes immediately.

| Frequency | Delay | Why |
|-----------|-------|-----|
| HIGH | 1-6 hours | 6-hour scoring window must clear |
| LOW | 24-48 hours | 24-hour prediction horizon + scoring window |

The dashboard displays these delays in:
- Header stats section
- Individual mission cards (score delay badges)
- Agent SOUL.md files

---

## File Structure

```
~/.clawdbot/
├── dashboard/
│   ├── src/
│   │   ├── App.tsx                 # Main app, queries Convex
│   │   ├── components/
│   │   │   ├── Header.tsx          # INVESTIGATION HQ header
│   │   │   ├── MissionBoard.tsx    # Kanban board with archive button
│   │   │   ├── AgentSidebar.tsx    # Agent status display
│   │   │   └── LiveFeed.tsx        # Activity log
│   │   └── index.css               # Styles including delay badges
│   ├── convex/
│   │   ├── missions.ts             # Mission CRUD operations
│   │   ├── agents.ts               # Agent status operations
│   │   ├── activities.ts           # Activity logging
│   │   └── schema.ts               # Database schema
│   ├── agent_runner.py             # Main investigation script
│   ├── log_activity.py             # CLI for dashboard operations
│   ├── fix_scheduled.mjs           # Sets countdown timers
│   ├── fix_assignments.mjs         # Corrects mission assignments
│   └── INVESTIGATION_SYSTEM.md     # This documentation
│
├── workspaces/
│   ├── coordinator/
│   │   ├── SOUL.md                 # Coordinator role definition
│   │   └── MEMORY.md               # Coordinator findings
│   ├── crypto/
│   │   ├── SOUL.md                 # Crypto specialist role
│   │   └── MEMORY.md               # Crypto investigation findings
│   ├── gold/
│   │   ├── SOUL.md                 # Gold specialist role
│   │   └── MEMORY.md               # Gold investigation findings
│   └── equities/
│       ├── SOUL.md                 # Equities specialist role
│       └── MEMORY.md               # Equities investigation findings
│
├── agent_runner.log                # Agent runner output log
└── fix_scheduled.log               # Scheduler script log
```

---

## Configuration

### Cron Jobs

```bash
# View current crontab
crontab -l

# Expected entries:
*/15 * * * * python3 ~/.clawdbot/dashboard/agent_runner.py >> ~/.clawdbot/agent_runner.log 2>&1
*/5  * * * * cd ~/.clawdbot/dashboard && node fix_scheduled.mjs >> ~/.clawdbot/fix_scheduled.log 2>&1
```

### Systemd Service (Dashboard)

```bash
# Check status
systemctl --user status mission-control

# Restart
systemctl --user restart mission-control

# View logs
journalctl --user -u mission-control -f
```

### Convex Backend

**URL:** `https://determined-goldfinch-126.convex.cloud`
**HTTP API:** `https://determined-goldfinch-126.convex.site`

The dashboard uses Convex for real-time data sync. All mission/agent state is stored in Convex.

---

## CLI Operations

### Mission Management

```bash
# List missions by status
python3 ~/.clawdbot/dashboard/log_activity.py --get-missions --mission-status assigned

# List missions by agent
python3 ~/.clawdbot/dashboard/log_activity.py --get-missions --agent crypto

# Create a mission
python3 ~/.clawdbot/dashboard/log_activity.py --mission "BTC HIGH: gap 1.3" --asset BTC --freq high --assignee crypto --priority high

# Update mission status
python3 ~/.clawdbot/dashboard/log_activity.py --mission-id <id> --mission-status done
```

### Agent Management

```bash
# Set agent status
python3 ~/.clawdbot/dashboard/log_activity.py --agent crypto --status online
python3 ~/.clawdbot/dashboard/log_activity.py --agent crypto --status active --task "Investigating BTC"
```

### Manual Agent Run

```bash
# Run agent_runner manually (useful for testing)
python3 ~/.clawdbot/dashboard/agent_runner.py

# Check the log
tail -50 ~/.clawdbot/agent_runner.log
```

---

## Verification

### Dashboard Working

1. Visit `http://localhost:3000`
2. Should see "INVESTIGATION HQ" header
3. Should see 4 agents in sidebar (online status)
4. Should see missions in columns

### Agents Processing

```bash
# Check agent runner log
tail -f ~/.clawdbot/agent_runner.log

# Look for:
# - "Found N missions for crypto"
# - "Investigating: BTC high"
# - "Running investigation for BTC high"
# - "Completed investigation: BTC high"
```

### Finding Cards Created

```bash
# Check review column
python3 ~/.clawdbot/dashboard/log_activity.py --get-missions --mission-status review
```

### Mission Assignment Fix

```bash
# If missions are assigned to wrong agents, run:
cd ~/.clawdbot/dashboard && node fix_assignments.mjs
```

---

## Troubleshooting

### Dashboard Not Loading

```bash
# Check service
systemctl --user status mission-control

# Restart if needed
systemctl --user restart mission-control

# Check for port conflict
lsof -i :3000
```

### Agents Show as Idle

```bash
# Set agents to online
python3 ~/.clawdbot/dashboard/log_activity.py --agent crypto --status online
python3 ~/.clawdbot/dashboard/log_activity.py --agent gold --status online
python3 ~/.clawdbot/dashboard/log_activity.py --agent equities --status online
python3 ~/.clawdbot/dashboard/log_activity.py --agent coordinator --status online
```

### Missions Not Being Processed

1. Check cron is running: `crontab -l`
2. Check agent_runner log: `tail -50 ~/.clawdbot/agent_runner.log`
3. Check missions are assigned to correct agents
4. Run fix_assignments.mjs if needed

### No Finding Cards Appearing

Finding cards only appear when notable issues are detected:
- Sigma ratio outside 0.85-1.15 range
- Gap ratio > 1.2
- Actual CRPS > 1.5x backtest potential

If metrics are within acceptable ranges, no card is created (this is expected).

---

## Integration with Optimization

This investigation system is **separate from** the main optimization pipeline:

| System | Purpose | Schedule |
|--------|---------|----------|
| Investigation | Analyze patterns, surface findings | Every 15 min |
| Optimization | Tune sigma_scale parameters | Every 30 min |

The optimization pipeline (`optimize_and_deploy.bat`) runs independently and actually changes parameters. The investigation system only observes and reports - it does not modify any miner parameters.

---

## Token Usage

**This system uses ZERO LLM tokens during operation.**

All components are deterministic code:
- Python scripts for backtesting and parsing
- React/Convex for dashboard
- String templates for formatting findings
- Cron for scheduling

The only LLM usage is during initial setup/debugging conversations with Claude.

---

## Future Enhancements

Potential improvements:
1. **Feedback loop:** Automatically adjust optimization based on findings
2. **Time-of-day analysis:** Track performance by hour
3. **Regime detection:** Identify volatility regime changes
4. **Alert thresholds:** Configurable notification thresholds
5. **Historical trending:** Track improvement over time

---

## Quick Reference

| Task | Command |
|------|---------|
| View dashboard | `http://localhost:3000` |
| Check agent status | `systemctl --user status mission-control` |
| View agent log | `tail -f ~/.clawdbot/agent_runner.log` |
| List assigned missions | `python3 ~/.clawdbot/dashboard/log_activity.py --get-missions --mission-status assigned` |
| Run agents manually | `python3 ~/.clawdbot/dashboard/agent_runner.py` |
| Fix assignments | `cd ~/.clawdbot/dashboard && node fix_assignments.mjs` |
| Set agent online | `python3 ~/.clawdbot/dashboard/log_activity.py --agent <name> --status online` |
