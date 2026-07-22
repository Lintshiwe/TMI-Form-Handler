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

export const updateStatus = mutation({
  args: {
    id: v.id("registrations"),
    status: v.string(),
    ticketId: v.optional(v.string()),
    ticketSent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = { status: args.status }
    if (args.ticketId !== undefined) patch.ticketId = args.ticketId
    if (args.ticketSent !== undefined) patch.ticketSent = args.ticketSent
    await ctx.db.patch(args.id, patch)
  },
})

export const getByTicketId = query({
  args: { ticketId: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db.query("registrations")
      .withIndex("by_ticketId", q => q.eq("ticketId", args.ticketId))
      .collect()
    return results.length > 0 ? results[0] : null
  },
})

export const checkIn = mutation({
  args: { ticketId: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db.query("registrations")
      .withIndex("by_ticketId", q => q.eq("ticketId", args.ticketId))
      .collect()
    if (results.length === 0) throw new Error("Ticket not found")
    const reg = results[0]
    if (reg.status === "Checked In") {
      await ctx.db.patch(reg._id, { scanAttempts: (reg.scanAttempts || 0) + 1 })
      throw new Error("already_checked_in")
    }
    await ctx.db.patch(reg._id, {
      status: "Checked In",
      checkedInAt: new Date().toISOString(),
      scanAttempts: (reg.scanAttempts || 0) + 1,
    })
  },
})
