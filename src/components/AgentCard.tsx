interface AgentData {
  agentId: string;
  status: string;
  lastRun: number;
  message?: string;
  currentTask?: string;
}

interface AgentCardProps {
  agentId: string;
  name: string;
  emoji: string;
  data?: AgentData;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}

export default function AgentCard({ agentId, name, emoji, data }: AgentCardProps) {
  const status = data?.status ?? "idle";
  const lastRun = data?.lastRun;
  const currentTask = data?.currentTask;

  return (
    <div className={"card agent-card " + status}>
      <div className="agent-header">
        <span className="agent-emoji">{emoji}</span>
        <div className="agent-info">
          <h3>{name}</h3>
          <span className="agent-id">{agentId}</span>
        </div>
      </div>
      <div className="agent-status">
        <span className={"dot " + status} />
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
      {currentTask && <div className="agent-task">{currentTask}</div>}
      {lastRun && <div className="agent-time">Last active: {formatTimeAgo(lastRun)}</div>}
      {!data && <div className="agent-time">Waiting for first run...</div>}
    </div>
  );
}
