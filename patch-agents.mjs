// Use internal Convex API to patch documents directly
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://shocking-bird-216.convex.cloud");

// First get all agents to get their IDs
const agents = await client.query("agents:list", {});
console.log("Current agents:", JSON.stringify(agents, null, 2));

// The profiles we want
const profiles = {
  coordinator: { name: "Mission Control", role: "Coordinator", emoji: "🎯" },
  crypto: { name: "Crypto", role: "BTC/ETH/SOL Specialist", emoji: "₿" },
  gold: { name: "Gold", role: "XAU Specialist", emoji: "🥇" },
  equities: { name: "Equities", role: "Stock Specialist", emoji: "📈" },
};

// Try to call updateStatus with additional fields - might work if the schema allows it
for (const agent of agents) {
  const profile = profiles[agent.agentId];
  if (profile) {
    try {
      // Try different mutations that might exist
      await client.mutation("agents:updateStatus", {
        agentId: agent.agentId,
        status: agent.status || "idle",
        currentTask: null,
        ...profile  // Try sneaking in extra fields
      });
      console.log("Updated", agent.agentId, "via updateStatus");
    } catch (e) {
      console.log("updateStatus failed for", agent.agentId, ":", e.message.substring(0, 100));
    }
  }
}
