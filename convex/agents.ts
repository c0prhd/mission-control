import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const get = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
  },
});

export const updateStatus = mutation({
  args: {
    agentId: v.string(),
    status: v.optional(v.string()),
    currentTask: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status ?? existing.status,
        lastRun: Date.now(),
        currentTask: args.currentTask,
      });
    }
  },
});

export const updateAgent = mutation({
  args: {
    agentId: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    emoji: v.optional(v.string()),
    status: v.optional(v.string()),
    currentTask: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();
    if (existing) {
      const updates: any = { lastRun: Date.now() };
      if (args.name) updates.name = args.name;
      if (args.role) updates.role = args.role;
      if (args.emoji) updates.emoji = args.emoji;
      if (args.status) updates.status = args.status;
      if (args.currentTask !== undefined) updates.currentTask = args.currentTask;
      await ctx.db.patch(existing._id, updates);
    }
  },
});

export const initializeAgents = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = [
      { agentId: "coordinator", name: "Mission Control", role: "Coordinator", emoji: "🎯" },
      { agentId: "crypto", name: "Crypto", role: "BTC/ETH/SOL Specialist", emoji: "₿" },
      { agentId: "gold", name: "Gold", role: "XAU Specialist", emoji: "🥇" },
      { agentId: "equities", name: "Equities", role: "Stock Specialist", emoji: "📈" },
    ];
    for (const profile of profiles) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_agent", (q) => q.eq("agentId", profile.agentId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { name: profile.name, role: profile.role, emoji: profile.emoji });
      } else {
        await ctx.db.insert("agents", { ...profile, status: "offline", lastRun: Date.now() });
      }
    }
  },
});
