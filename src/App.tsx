import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Sidebar from "./components/Sidebar";
import MissionBoard from "./components/MissionBoard";
import LiveFeed from "./components/LiveFeed";
import Header from "./components/Header";
import "./index.css";

function App() {
  const agents = useQuery(api.agents.list) ?? [];
  const missions = useQuery(api.missions.list) ?? [];
  const activities = useQuery(api.activities.recent, { limit: 20 }) ?? [];
  const assets = useQuery(api.assets.list) ?? [];

  const onlineAgents = agents.filter(a => a.status === "online" || a.status === "active").length;
  const totalMissions = missions.filter(m => m.status !== "deleted").length;
  const activeMissions = missions.filter(m => !["done", "deleted"].includes(m.status)).length;

  return (
    <div className="app">
      <Header 
        agentsActive={onlineAgents}
        totalAgents={agents.length}
        missionsActive={activeMissions}
        totalMissions={totalMissions}
      />
      <div className="main-layout">
        <Sidebar agents={agents} />
        <MissionBoard missions={missions} agents={agents} />
        <LiveFeed activities={activities} agents={agents} />
      </div>
    </div>
  );
}

export default App;
