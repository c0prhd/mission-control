interface Agent {
  _id: string;
  agentId: string;
  name?: string;
  role?: string;
  emoji?: string;
  status: string;
  lastRun: number;
  currentTask?: string;
}

interface SidebarProps {
  agents: Agent[];
}

// Default profiles for agents without name/role/emoji in DB
const DEFAULT_PROFILES: Record<string, { name: string; role: string; emoji: string }> = {
  coordinator: { name: "Mission Control", role: "Coordinator", emoji: "🎯" },
  crypto: { name: "Crypto", role: "BTC/ETH/SOL Specialist", emoji: "₿" },
  gold: { name: "Gold", role: "XAU Specialist", emoji: "🥇" },
  equities: { name: "Equities", role: "Stock Specialist", emoji: "📈" },
};

function getAgentProfile(agent: Agent) {
  const defaults = DEFAULT_PROFILES[agent.agentId] || { 
    name: agent.agentId, 
    role: "Agent", 
    emoji: "🤖" 
  };
  return {
    name: agent.name || defaults.name,
    role: agent.role || defaults.role,
    emoji: agent.emoji || defaults.emoji,
  };
}

export default function Sidebar({ agents }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>AGENTS</h2>
      </div>
      <div className="agents-list">
        {agents.map((agent) => {
          const profile = getAgentProfile(agent);
          return (
            <div key={agent._id} className={"agent-item " + agent.status}>
              <div className="agent-avatar">{profile.emoji}</div>
              <div className="agent-info">
                <div className="agent-name">{profile.name}</div>
                <div className="agent-role">{profile.role}</div>
              </div>
              <div className={"agent-status-dot " + agent.status} title={agent.status}></div>
            </div>
          );
        })}
        {agents.length === 0 && (
          <div className="empty-agents">No agents configured</div>
        )}
      </div>
    </aside>
  );
}
