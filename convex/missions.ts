import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all missions
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("missions").order("desc").collect();
  },
});

// Get missions by status (for Kanban columns)
export const byStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("missions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Get missions assigned to agent
export const byAssignee = query({
  args: { agentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("missions")
      .withIndex("by_assignee", (q) => q.eq("assignedTo", args.agentId))
      .collect();
  },
});

// Create a new mission
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    asset: v.optional(v.string()),
    frequency: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    scheduledFor: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Determine status: explicit > assignedTo logic > inbox
    let status = args.status;
    if (!status) {
      status = args.assignedTo ? "assigned" : "inbox";
    }
    return await ctx.db.insert("missions", {
      title: args.title,
      description: args.description,
      status,
      priority: args.priority ?? "medium",
      assignedTo: args.assignedTo,
      asset: args.asset,
      frequency: args.frequency,
      tags: args.tags,
      scheduledFor: args.scheduledFor,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update mission status (move in Kanban)
export const updateStatus = mutation({
  args: {
    id: v.id("missions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const update: any = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "done") {
      update.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, update);
  },
});

// Assign mission to agent
export const assign = mutation({
  args: {
    id: v.id("missions"),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      assignedTo: args.agentId,
      status: "assigned",
      updatedAt: Date.now(),
    });
  },
});

// Update mission details
export const update = mutation({
  args: {
    id: v.id("missions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete mission
export const remove = mutation({
  args: { id: v.id("missions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get mission counts by status
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const missions = await ctx.db.query("missions").collect();
    const counts: Record<string, number> = {
      inbox: 0,
      assigned: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
    for (const m of missions) {
      if (counts[m.status] !== undefined) {
        counts[m.status]++;
      }
    }
    return counts;
  },
});

// Initialize sample missions
export const initializeSampleMissions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("missions").first();
    if (existing) return; // Already initialized

    const now = Date.now();
    const sampleMissions = [
      { title: "Optimize BTC sigma for HIGH frequency", asset: "BTC", frequency: "high", status: "inbox", priority: "high" },
      { title: "Investigate XAU quiet hours performance", asset: "XAU", frequency: "high", status: "inbox", priority: "medium" },
      { title: "Review SPYX gap ratio trend", asset: "SPYX", frequency: "low", status: "assigned", assignedTo: "equities", priority: "high" },
      { title: "Update ETH model parameters", asset: "ETH", frequency: "high", status: "in_progress", assignedTo: "crypto", priority: "medium" },
      { title: "Analyze SOL weekend behavior", asset: "SOL", frequency: "low", status: "review", assignedTo: "crypto", priority: "low" },
      { title: "Deploy optimized XAU params", asset: "XAU", frequency: "high", status: "done", assignedTo: "gold", priority: "high" },
    ];

    for (const mission of sampleMissions) {
      await ctx.db.insert("missions", {
        ...mission,
        createdAt: now,
        updatedAt: now,
        completedAt: mission.status === "done" ? now : undefined,
      });
    }
  },
});

// Clear all missions (for reset)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const missions = await ctx.db.query("missions").collect();
    for (const m of missions) {
      await ctx.db.delete(m._id);
    }
    return missions.length;
  },
});
