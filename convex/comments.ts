import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get comments for a mission
export const byMission = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
  },
});

// Add a comment
export const add = mutation({
  args: {
    missionId: v.id("missions"),
    agentId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("comments", {
      missionId: args.missionId,
      agentId: args.agentId,
      text: args.text,
      timestamp: Date.now(),
    });
  },
});
