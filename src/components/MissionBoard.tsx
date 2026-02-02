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

// Score delay indicator for mission cards
function ScoreDelayBadge({ frequency }: { frequency?: string }) {
  if (!frequency) return null;

  const isHigh = frequency.toLowerCase() === "high";
  const delay = isHigh ? "1-6h delay" : "24-48h delay";
  const className = isHigh ? "delay-badge-high" : "delay-badge-low";

  return (
    <span className={`score-delay-badge ${className}`} title={`Rank changes take ${delay} to reflect`}>
      ⏳ {delay}
    </span>
  );
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

// Updated columns for investigation workflow
const COLUMNS = [
  { id: "inbox", label: "ISSUES DETECTED", color: "#f87171", description: "Problems identified by coordinator" },
  { id: "assigned", label: "ASSIGNED", color: "#60a5fa", description: "Waiting for specialist" },
  { id: "in_progress", label: "INVESTIGATING", color: "#fbbf24", description: "Agent running analysis" },
  { id: "review", label: "FINDINGS", color: "#a78bfa", description: "Investigation complete" },
  { id: "done", label: "ARCHIVED", color: "#34d399", description: "Knowledge captured" },
];

interface MissionCardProps {
  mission: Mission;
  agents: Agent[];
  onArchive?: (id: any) => void;
  showArchiveButton?: boolean;
}

function MissionCard({ mission, agents, onArchive, showArchiveButton }: MissionCardProps) {
  const agent = agents.find(a => a.agentId === mission.assignedTo);
  const priorityClass = mission.priority === "high" ? "priority-high" :
                        mission.priority === "low" ? "priority-low" : "";
  const isScheduled = mission.tags?.includes("scheduled") || mission.scheduledFor;
  const scheduledClass = isScheduled ? "mission-scheduled" : "";

  // Determine if this is an investigation/finding mission
  const isFinding = mission.tags?.includes("finding") ||
                    mission.title.startsWith("🔍");
  const isInvestigation = isFinding ||
                          mission.tags?.includes("investigate") ||
                          mission.title.toLowerCase().includes("investigate") ||
                          mission.title.toLowerCase().includes("gap");

  return (
    <div className={`mission-card ${priorityClass} ${scheduledClass} ${isFinding ? "mission-finding" : ""}`}>
      <div className="mission-header">
        <div className="mission-title">
          {isInvestigation && !isFinding && <span className="investigation-icon">🔍</span>}
          {mission.title}
        </div>
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
          <>
            <span className="mission-tag freq">{mission.frequency.toUpperCase()}</span>
            <ScoreDelayBadge frequency={mission.frequency} />
          </>
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
      {showArchiveButton && onArchive && (
        <button
          className="archive-button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(mission._id);
          }}
          title="Mark as reviewed and archive"
        >
          ✓ Archive
        </button>
      )}
    </div>
  );
}

export default function MissionBoard({ missions, agents }: MissionBoardProps) {
  const updateStatus = useMutation(api.missions.updateStatus);

  const handleArchive = async (missionId: any) => {
    try {
      await updateStatus({ id: missionId, status: "done" });
    } catch (error) {
      console.error("Failed to archive mission:", error);
    }
  };

  return (
    <main className="mission-board">
      <div className="board-header">
        <h2>INVESTIGATION BOARD</h2>
        <p className="board-subtitle">
          Agents investigate patterns • Optimization runs automatically every 30min
        </p>
      </div>
      <div className="board-columns">
        {COLUMNS.map((column) => {
          const columnMissions = missions.filter(m => m.status === column.id);
          const isReviewColumn = column.id === "review";
          return (
            <div key={column.id} className="board-column">
              <div className="column-header" style={{ borderTopColor: column.color }}>
                <span className="column-title">{column.label}</span>
                <span className="column-count">{columnMissions.length}</span>
              </div>
              <div className="column-description">{column.description}</div>
              <div className="column-cards">
                {columnMissions.map((mission) => (
                  <MissionCard
                    key={mission._id}
                    mission={mission}
                    agents={agents}
                    showArchiveButton={isReviewColumn}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
