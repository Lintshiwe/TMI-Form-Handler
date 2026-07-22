import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("registrations").order("desc").collect()
  },
})

export const getStats = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("registrations").collect()
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "Pending").length,
      approved: all.filter((r) => r.status === "Approved").length,
      checkedIn: all.filter((r) => r.status === "Checked In").length,
    }
  },
})

export const register = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.string(),
    address: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
    teamName: v.string(),
    hackathonTrack: v.string(),
    academicYear: v.string(),
    skills: v.string(),
    whyJoin: v.string(),
    tshirtSize: v.string(),
    howHeard: v.string(),
    githubHandle: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    emergencyFirstName: v.string(),
    emergencyLastName: v.string(),
    emergencyPhone: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("registrations", {
      ...args,
      createdAt: new Date().toISOString(),
      status: "Pending",
    })
  },
})
