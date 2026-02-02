import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://determined-goldfinch-126.convex.cloud");

// Get missions
const missionsResult = await client.query("missions:list", {});
console.log("Found " + missionsResult.length + " missions");

// Delete each mission
for (const m of missionsResult) {
  try {
    await client.mutation("missions:remove", { id: m._id });
    console.log("Deleted: " + m.title);
  } catch (e) {
    console.log("Failed: " + e.message.substring(0, 80));
  }
}

// Reset agents to idle  
const agents = await client.query("agents:list", {});
for (const a of agents) {
  await client.mutation("agents:updateAgent", { 
    agentId: a.agentId, 
    status: "idle"
  });
  console.log("Reset agent: " + a.agentId);
}

console.log("Done!");
