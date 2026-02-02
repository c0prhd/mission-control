import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://determined-goldfinch-126.convex.cloud");

const missions = await client.query("missions:list");
console.log("\n=== MISSIONS (active) ===");
for (const m of missions) {
  if (m.status !== "done" && m.status !== "deleted") {
    const assignee = m.assignedTo || "-";
    console.log(`${m.status.padEnd(12)} | ${assignee.padEnd(10)} | ${m.title.slice(0,50)}`);
  }
}

const agents = await client.query("agents:list");
console.log("\n=== AGENTS ===");
for (const a of agents) {
  const task = a.currentTask || "idle";
  console.log(`${a.status.padEnd(8)} | ${a.name.padEnd(12)} | ${task}`);
}
