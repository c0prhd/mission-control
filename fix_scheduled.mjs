import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://determined-goldfinch-126.convex.cloud");

// Get current time
const now = Date.now();

// Calculate next 11pm CT (Central Time is UTC-6)
// 11pm CT = 5am UTC next day
const nowUTC = new Date();
let next11pmCT = new Date(nowUTC);
next11pmCT.setUTCHours(5, 0, 0, 0); // 5am UTC = 11pm CT
if (next11pmCT.getTime() < now) {
  next11pmCT.setUTCDate(next11pmCT.getUTCDate() + 1); // Tomorrow
}

// Next health check in 15 minutes
const next15min = now + 15 * 60 * 1000;

const missions = await client.query("missions:list");
for (const m of missions) {
  if (m.status === "inbox" && m.title.includes("Daily summary")) {
    console.log(`Updating "${m.title}" with scheduledFor: ${next11pmCT.toISOString()}`);
    await client.mutation("missions:update", {
      id: m._id,
      scheduledFor: next11pmCT.getTime(),
    });
  }
  if (m.status === "inbox" && m.title.toLowerCase().includes("health check")) {
    console.log(`Updating "${m.title}" with scheduledFor: ${new Date(next15min).toISOString()}`);
    await client.mutation("missions:update", {
      id: m._id,
      scheduledFor: next15min,
    });
  }
}

console.log("\nDone! Refresh dashboard to see countdowns.");
