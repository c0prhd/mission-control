import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log an activity
export const log = mutation({
  args: {
    agentId: v.string(),
    action: v.string(),
    asset: v.optional(v.string()),
    frequency: v.optional(v.string()),
    result: v.string(),
    details: v.optional(v.string()),
    gapRatio: v.optional(v.number()),
    sigmaOld: v.optional(v.number()),
    sigmaNew: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activities", {
      ...args,
      timestamp: Date.now(),
    });

    // Also update agent status
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();

    if (agent) {
      await ctx.db.patch(agent._id, {
        lastRun: Date.now(),
        status: args.result === "failure" ? "error" : "active",
        currentTask: args.action,
      });
    }
  },
});

// Get recent activities
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("activities")
      .withIndex("by_time")
      .order("desc")
      .take(limit);
  },
});

// Get activities for specific agent
export const byAgent = query({
  args: { agentId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

// Get activities for specific asset
export const byAsset = query({
  args: { 
    asset: v.string(), 
    frequency: v.optional(v.string()),
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("activities")
      .withIndex("by_asset", (q) => {
        if (args.frequency) {
          return q.eq("asset", args.asset).eq("frequency", args.frequency);
        }
        return q.eq("asset", args.asset);
      });
    
    return await query.order("desc").take(limit);
  },
});

// Clear all activities (for reset)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db.query("activities").collect();
    for (const a of activities) {
      await ctx.db.delete(a._id);
    }
    return activities.length;
  },
});
