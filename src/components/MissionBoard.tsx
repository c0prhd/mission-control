import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../convex/_generated/api";

interface Mission {
  _id: any;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  asset?: string;
  frequency?: string;
  tags?: string[];
  scheduledFor?: number;
  createdAt: number;
  updatedAt: number;
}

// Countdown timer component
function Countdown({ targetTime }: { targetTime: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft("Now!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return <span className="countdown-timer">{timeLeft}</span>;
}

interface Agent {
  agentId: string;
  name: string;
  emoji: string;
}

interface MissionBoardProps {
  missions: Mission[];
  agents: Agent[];
}

const COLUMNS = [
  { id: "inbox", label: "INBOX", color: "#94a3b8" },
  { id: "assigned", label: "ASSIGNED", color: "#60a5fa" },
  { id: "in_progress", label: "IN PROGRESS", color: "#fbbf24" },
  { id: "review", label: "REVIEW", color: "#a78bfa" },
  { id: "done", label: "DONE", color: "#34d399" },
];

function MissionCard({ mission, agents }: { mission: Mission; agents: Agent[] }) {
  const agent = agents.find(a => a.agentId === mission.assignedTo);
  const priorityClass = mission.priority === "high" ? "priority-high" :
                        mission.priority === "low" ? "priority-low" : "";
  const isScheduled = mission.tags?.includes("scheduled") || mission.scheduledFor;
  const scheduledClass = isScheduled ? "mission-scheduled" : "";

  return (
    <div className={`mission-card ${priorityClass} ${scheduledClass}`}>
      <div className="mission-header">
        <div className="mission-title">{mission.title}</div>
        {mission.scheduledFor && (
          <div className="mission-countdown">
            <span className="countdown-icon">⏱</span>
            <Countdown targetTime={mission.scheduledFor} />
          </div>
        )}
      </div>
      {mission.description && (
        <div className="mission-desc">{mission.description}</div>
      )}
      <div className="mission-meta">
        {mission.asset && (
          <span className="mission-tag asset">{mission.asset}</span>
        )}
        {mission.frequency && (
          <span className="mission-tag freq">{mission.frequency.toUpperCase()}</span>
        )}
        {isScheduled && !mission.scheduledFor && (
          <span className="mission-tag scheduled">SCHEDULED</span>
        )}
        {agent && (
          <span className="mission-assignee" title={agent.name}>
            {agent.emoji}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MissionBoard({ missions, agents }: MissionBoardProps) {
  return (
    <main className="mission-board">
      <div className="board-header">
        <h2>MISSION QUEUE</h2>
      </div>
      <div className="board-columns">
        {COLUMNS.map((column) => {
          const columnMissions = missions.filter(m => m.status === column.id);
          return (
            <div key={column.id} className="board-column">
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <span className="column-title">{column.label}</span>
                <span className="column-count">{columnMissions.length}</span>
              </div>
              <div className="column-cards">
                {columnMissions.map((mission) => (
                  <MissionCard key={mission._id} mission={mission} agents={agents} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
