import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent profiles
  agents: defineTable({
    agentId: v.string(),        // "coordinator", "crypto", "gold", "equities"
    name: v.string(),           // Display name
    role: v.string(),           // Role/title
    emoji: v.string(),          // Avatar emoji
    status: v.string(),         // "online", "offline", "busy"
    lastRun: v.number(),        // timestamp ms
    currentTask: v.optional(v.string()),
  }).index("by_agent", ["agentId"]),

  // Missions (Kanban tasks)
  missions: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),         // "inbox", "assigned", "in_progress", "review", "done"
    priority: v.optional(v.string()), // "low", "medium", "high"
    assignedTo: v.optional(v.string()), // agentId
    asset: v.optional(v.string()),      // BTC, XAU, etc.
    frequency: v.optional(v.string()),  // high, low
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    scheduledFor: v.optional(v.number()), // Unix timestamp (ms) for countdown timer
  }).index("by_status", ["status"])
    .index("by_assignee", ["assignedTo"])
    .index("by_asset", ["asset"]),

  // Activity log (live feed)
  activities: defineTable({
    agentId: v.string(),
    action: v.string(),         // "check", "optimize", "deploy", "spawn", "alert", "comment"
    asset: v.optional(v.string()),
    frequency: v.optional(v.string()),
    result: v.string(),         // "success", "failure", "skipped", "pending"
    details: v.optional(v.string()),
    missionId: v.optional(v.id("missions")),
    gapRatio: v.optional(v.number()),
    sigmaOld: v.optional(v.number()),
    sigmaNew: v.optional(v.number()),
    timestamp: v.number(),
  }).index("by_agent", ["agentId"])
    .index("by_time", ["timestamp"])
    .index("by_asset", ["asset", "frequency"])
    .index("by_mission", ["missionId"]),

  // Asset health status
  assets: defineTable({
    symbol: v.string(),
    frequency: v.string(),
    gapRatio: v.number(),
    rank: v.optional(v.number()),
    status: v.string(),         // "healthy", "warning", "critical"
    lastUpdate: v.number(),
    lastOptimized: v.optional(v.number()),
    currentSigma: v.optional(v.number()),
  }).index("by_asset", ["symbol", "frequency"])
    .index("by_status", ["status"]),

  // Comments on missions
  comments: defineTable({
    missionId: v.id("missions"),
    agentId: v.string(),
    text: v.string(),
    timestamp: v.number(),
  }).index("by_mission", ["missionId"]),
});
