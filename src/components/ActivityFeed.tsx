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

interface ActivityFeedProps {
  activities: Activity[];
}

const icons: Record<string, string> = {
  check: "🔍", optimize: "⚡", deploy: "🚀", spawn: "🔱", alert: "🚨"
};

const emojis: Record<string, string> = {
  coordinator: "🎯", crypto: "₿", gold: "🥇", equities: "📈"
};

function formatTimeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">📭</div>
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map((a) => (
        <div key={a._id} className="activity-item">
          <div className={"activity-icon " + a.action}>{icons[a.action] ?? "📋"}</div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-agent">{emojis[a.agentId] ?? "🤖"} {a.agentId}</span>
              <span className="activity-time">{formatTimeAgo(a.timestamp)}</span>
            </div>
            <div className="activity-details">
              <strong>{a.action}</strong>
              {a.asset && <span> {a.asset}</span>}
              {a.frequency && <span style={{color: "var(--text-muted)"}}> ({a.frequency})</span>}
              <span className={"activity-result " + a.result}>{a.result}</span>
            </div>
            {a.details && <div style={{fontSize: 12, color: "var(--text-muted)", marginTop: 4}}>{a.details}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
