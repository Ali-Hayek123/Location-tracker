import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    locations: defineTable({
        userId: v.string(),
        userName: v.string(),
        latitude: v.float64(),
        longitude: v.float64(),
        accuracy: v.optional(v.float64()),
        speed: v.optional(v.union(v.float64(), v.null())),
        heading: v.optional(v.union(v.float64(), v.null())),
        lastUpdated: v.number(),
        isActive: v.boolean(),
        color: v.string(),
    }).index("by_userId", ["userId"]),
    location_history: defineTable({
        userId: v.string(),
        userName: v.string(),
        latitude: v.float64(),
        longitude: v.float64(),
        accuracy: v.optional(v.float64()),
        speed: v.optional(v.union(v.float64(), v.null())),
        heading: v.optional(v.union(v.float64(), v.null())),
        timestamp: v.number(),
        color: v.string(),
    }).index("by_userId", ["userId"]),
});
