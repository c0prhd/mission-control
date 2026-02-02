interface HeaderProps {
  agentsActive: number;
  totalAgents: number;
  missionsActive: number;
  totalMissions: number;
}

export default function Header({ agentsActive, totalAgents, missionsActive, totalMissions }: HeaderProps) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">MISSION CONTROL</span>
          <span className="logo-badge">SYNTH</span>
        </div>
      </div>
      
      <div className="header-stats">
        <div className="stat">
          <div className="stat-value">{agentsActive}</div>
          <div className="stat-label">AGENTS ACTIVE</div>
        </div>
        <div className="stat">
          <div className="stat-value">{missionsActive}</div>
          <div className="stat-label">MISSIONS ACTIVE</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-time">
          <div className="time">{time}</div>
          <div className="date">{date}</div>
        </div>
        <div className="status-badge online">
          <span className="status-dot"></span>
          ONLINE
        </div>
      </div>
    </header>
  );
}
