import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all assets
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("assets").collect();
  },
});

// Get assets by status
export const byStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assets")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Update asset status
export const update = mutation({
  args: {
    symbol: v.string(),
    frequency: v.string(),
    gapRatio: v.number(),
    rank: v.optional(v.number()),
    currentSigma: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Determine status based on gap ratio
    let status = "healthy";
    if (args.gapRatio > 1.20) {
      status = "critical";
    } else if (args.gapRatio > 1.10) {
      status = "warning";
    }

    const existing = await ctx.db
      .query("assets")
      .withIndex("by_asset", (q) => 
        q.eq("symbol", args.symbol).eq("frequency", args.frequency)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gapRatio: args.gapRatio,
        rank: args.rank,
        status,
        lastUpdate: Date.now(),
        currentSigma: args.currentSigma,
      });
    } else {
      await ctx.db.insert("assets", {
        symbol: args.symbol,
        frequency: args.frequency,
        gapRatio: args.gapRatio,
        rank: args.rank,
        status,
        lastUpdate: Date.now(),
        currentSigma: args.currentSigma,
      });
    }
  },
});

// Mark asset as optimized
export const markOptimized = mutation({
  args: {
    symbol: v.string(),
    frequency: v.string(),
    newSigma: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_asset", (q) => 
        q.eq("symbol", args.symbol).eq("frequency", args.frequency)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastOptimized: Date.now(),
        currentSigma: args.newSigma,
      });
    }
  },
});

// Initialize all assets
export const initializeAssets = mutation({
  args: {},
  handler: async (ctx) => {
    const assets = [
      // HIGH frequency
      { symbol: "BTC", frequency: "high" },
      { symbol: "ETH", frequency: "high" },
      { symbol: "SOL", frequency: "high" },
      { symbol: "XAU", frequency: "high" },
      // LOW frequency
      { symbol: "BTC", frequency: "low" },
      { symbol: "ETH", frequency: "low" },
      { symbol: "SOL", frequency: "low" },
      { symbol: "XAU", frequency: "low" },
      { symbol: "SPYX", frequency: "low" },
      { symbol: "NVDAX", frequency: "low" },
      { symbol: "TSLAX", frequency: "low" },
      { symbol: "AAPLX", frequency: "low" },
      { symbol: "GOOGLX", frequency: "low" },
    ];

    for (const asset of assets) {
      const existing = await ctx.db
        .query("assets")
        .withIndex("by_asset", (q) => 
          q.eq("symbol", asset.symbol).eq("frequency", asset.frequency)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("assets", {
          ...asset,
          gapRatio: 1.0,
          status: "healthy",
          lastUpdate: Date.now(),
        });
      }
    }
  },
});
