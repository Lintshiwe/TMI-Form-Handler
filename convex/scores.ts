import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("scores").order("desc").collect()
  },
})

export const getByProjectId = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.query("scores")
      .withIndex("by_projectId", q => q.eq("projectId", args.projectId))
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    judgeName: v.string(),
    innovation: v.number(),
    technical: v.number(),
    impact: v.number(),
    presentation: v.number(),
  },
  handler: async (ctx, args) => {
    const total = args.innovation + args.technical + args.impact + args.presentation
    await ctx.db.insert("scores", {
      ...args,
      total,
      submittedAt: new Date().toISOString(),
    })
  },
})
