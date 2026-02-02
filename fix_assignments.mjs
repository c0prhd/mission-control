import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexHttpClient("https://determined-goldfinch-126.convex.cloud");

const CRYPTO = ["BTC", "ETH", "SOL"];
const GOLD = ["XAU"];
const EQUITIES = ["SPYX", "NVDAX", "TSLAX", "AAPLX", "GOOGLX"];

async function fixAssignments() {
  const missions = await client.query(api.missions.list);
  const assigned = missions.filter(m => m.status === "assigned");

  console.log("Checking", assigned.length, "assigned missions...");

  let fixed = 0;
  let deleted = 0;

  for (const m of assigned) {
    const title = m.title || "";
    const asset = m.asset || "";

    // Delete placeholder missions
    if (title.includes("FREQ: gap X.XX") || title.trim() === "") {
      await client.mutation(api.missions.updateStatus, { id: m._id, status: "deleted" });
      console.log("Deleted placeholder:", m._id);
      deleted++;
      continue;
    }

    // Determine correct agent based on asset
    let correctAgent = null;
    const assetUpper = asset.toUpperCase();
    const titleUpper = title.toUpperCase();

    for (const a of CRYPTO) {
      if (assetUpper === a || titleUpper.includes(a + " ")) correctAgent = "crypto";
    }
    for (const a of GOLD) {
      if (assetUpper === a || titleUpper.includes(a + " ")) correctAgent = "gold";
    }
    for (const a of EQUITIES) {
      if (assetUpper === a || titleUpper.includes(a + " ")) correctAgent = "equities";
    }

    if (correctAgent && m.assignedTo !== correctAgent) {
      await client.mutation(api.missions.assign, { id: m._id, agentId: correctAgent });
      console.log("Reassigned", title.substring(0, 40), "from", m.assignedTo, "to", correctAgent);
      fixed++;
    }
  }

  console.log("Fixed", fixed, "assignments, deleted", deleted, "placeholders");
}

fixAssignments().catch(console.error);
