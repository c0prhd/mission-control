import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://shocking-bird-216.convex.cloud");

const profiles = [
  { agentId: "coordinator", name: "Mission Control", role: "Coordinator", emoji: "🎯" },
  { agentId: "crypto", name: "Crypto", role: "BTC/ETH/SOL Specialist", emoji: "₿" },
  { agentId: "gold", name: "Gold", role: "XAU Specialist", emoji: "🥇" },
  { agentId: "equities", name: "Equities", role: "Stock Specialist", emoji: "📈" },
];

// Try to call initializeAgents first
try {
  await client.mutation("agents:initializeAgents", {});
  console.log("Called initializeAgents successfully");
} catch (e) {
  console.log("initializeAgents failed:", e.message);
  // Fall back to updateAgent
  for (const profile of profiles) {
    try {
      await client.mutation("agents:updateAgent", profile);
      console.log("Updated:", profile.agentId);
    } catch (e2) {
      console.log("updateAgent failed for", profile.agentId, ":", e2.message);
    }
  }
}
