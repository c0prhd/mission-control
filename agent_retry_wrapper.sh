#!/bin/bash
# Agent Retry Wrapper with Exponential Backoff
# Usage: agent_retry_wrapper.sh <agent_name> <message> [max_retries]

AGENT_NAME="$1"
MESSAGE="$2"
MAX_RETRIES="${3:-3}"
CLEANUP_SCRIPT="$HOME/.clawdbot/dashboard/mission_cleanup.py"

export PATH="/home/shannon/.npm-global/bin:$PATH"

# Check if we should run (backoff check)
BACKOFF_CHECK=$(python3 "$CLEANUP_SCRIPT" --check-agent "$AGENT_NAME" 2>&1)
if [[ "$BACKOFF_CHECK" == WAIT* ]]; then
    echo "Agent $AGENT_NAME in backoff: $BACKOFF_CHECK"
    exit 0
fi

RETRY=0
SUCCESS=false

while [ $RETRY -lt $MAX_RETRIES ] && [ "$SUCCESS" = false ]; do
    echo "Attempt $((RETRY + 1)) of $MAX_RETRIES for agent $AGENT_NAME"
    
    OUTPUT=$(openclaw agent --agent "$AGENT_NAME" --message "$MESSAGE" --local --timeout 180 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ] && [[ ! "$OUTPUT" =~ "timed out" ]] && [[ ! "$OUTPUT" =~ "rate limit" ]]; then
        SUCCESS=true
        echo "Agent $AGENT_NAME succeeded"
        python3 "$CLEANUP_SCRIPT" --record-success "$AGENT_NAME"
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            case $RETRY in
                1) BACKOFF=30 ;;
                2) BACKOFF=60 ;;
                3) BACKOFF=120 ;;
                *) BACKOFF=240 ;;
            esac
            echo "Failed, waiting ${BACKOFF}s before retry..."
            sleep $BACKOFF
        fi
    fi
done

if [ "$SUCCESS" = false ]; then
    echo "Agent $AGENT_NAME failed after $MAX_RETRIES attempts"
    python3 "$CLEANUP_SCRIPT" --record-failure "$AGENT_NAME"
    exit 1
fi
exit 0
