interface Activity {
  _id: string;
  agentId: string;
  action: string;
  asset?: string;
  frequency?: string;
  result: string;
  details?: string;
  timestamp: number;
}

interface Agent {
  agentId: string;
  name: string;
  emoji: string;
}

interface LiveFeedProps {
  activities: Activity[];
  agents: Agent[];
}

function formatTimeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function getActionVerb(action: string): string {
  const verbs: Record<string, string> = {
    check: "checked",
    optimize: "optimized",
    deploy: "deployed",
    spawn: "spawned",
    alert: "alerted on",
    comment: "commented on",
  };
  return verbs[action] || action;
}

export default function LiveFeed({ activities, agents }: LiveFeedProps) {
  const getAgent = (agentId: string) => agents.find(a => a.agentId === agentId);

  return (
    <aside className="live-feed">
      <div className="feed-header">
        <h2>LIVE FEED</h2>
        <div className="feed-filter">All Agents</div>
      </div>
      <div className="feed-list">
        {activities.map((activity) => {
          const agent = getAgent(activity.agentId);
          return (
            <div key={activity._id} className="feed-item">
              <div className="feed-avatar">{agent?.emoji || "🤖"}</div>
              <div className="feed-content">
                <div className="feed-text">
                  <span className="feed-agent">{agent?.name || activity.agentId}</span>
                  {" "}{getActionVerb(activity.action)}
                  {activity.asset && <span className="feed-asset"> {activity.asset}</span>}
                  {activity.details && (
                    <span className="feed-details"> - {activity.details}</span>
                  )}
                </div>
                <div className="feed-time">{formatTimeAgo(activity.timestamp)}</div>
              </div>
              <div className={"feed-status " + activity.result}></div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="empty-feed">No activity yet</div>
        )}
      </div>
    </aside>
  );
}
