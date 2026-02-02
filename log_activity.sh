#!/bin/bash
# Log activity to Synth Mission Control dashboard
# Usage: ./log_activity.sh <agent_id> <action> <result> [asset] [frequency] [details]
#
# Examples:
#   ./log_activity.sh crypto check success BTC high "Gap ratio 1.05"
#   ./log_activity.sh coordinator spawn success "" "" "Spawned crypto agent"

CONVEX_URL="https://determined-goldfinch-126.convex.site"
API_KEY="8c03d7f84ad885c3038b8ec7865bc2eedd4f62e54d20a5ce0a3033006d5abbd5"

AGENT_ID=""
ACTION=""
RESULT=""
ASSET=""
FREQUENCY=""
DETAILS=""

# Build JSON payload
JSON="{\"agentId\":\"\",\"action\":\"\",\"result\":\"\""

if [ -n "" ]; then
    JSON=",\"asset\":\"\""
fi

if [ -n "" ]; then
    JSON=",\"frequency\":\"\""
fi

if [ -n "" ]; then
    ESCAPED_DETAILS=\\"\\"
    JSON=",\"details\":\"\""
fi

JSON="}"

curl -s -X POST "/log"     -H "Content-Type: application/json"     -H "Authorization: Bearer "     -d "" > /dev/null 2>&1

echo "Logged:   "
