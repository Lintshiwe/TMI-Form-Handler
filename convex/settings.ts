import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getRegistrationStatus = query({
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "registrationOpen"))
      .first()
    return setting ? setting.value === "true" : false
  },
})

export const setRegistrationStatus = mutation({
  args: { open: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "registrationOpen"))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.open) })
    } else {
      await ctx.db.insert("settings", {
        key: "registrationOpen",
        value: String(args.open),
      })
    }
  },
})
