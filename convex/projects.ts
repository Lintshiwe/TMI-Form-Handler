import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").collect()
  },
})

export const getByRegistrationId = query({
  args: { registrationId: v.id("registrations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("projects")
      .withIndex("by_registrationId", q => q.eq("registrationId", args.registrationId))
      .first()
  },
})

export const create = mutation({
  args: {
    registrationId: v.id("registrations"),
    projectName: v.string(),
    description: v.string(),
    hackathonTrack: v.string(),
    teamName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("projects")
      .withIndex("by_registrationId", q => q.eq("registrationId", args.registrationId))
      .first()
    if (existing) {
      throw new Error("Project already submitted for this registration")
    }
    await ctx.db.insert("projects", {
      ...args,
      submittedAt: new Date().toISOString(),
    })
  },
})
