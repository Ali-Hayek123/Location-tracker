import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateLocation = mutation({
    args: {
        userId: v.string(),
        userName: v.string(),
        latitude: v.float64(),
        longitude: v.float64(),
        accuracy: v.optional(v.float64()),
        speed: v.optional(v.union(v.float64(), v.null())),
        heading: v.optional(v.union(v.float64(), v.null())),
        color: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if this user already has a location entry
        const existing = await ctx.db
            .query("locations")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            // Update existing location
            await ctx.db.patch(existing._id, {
                latitude: args.latitude,
                longitude: args.longitude,
                accuracy: args.accuracy,
                speed: args.speed,
                heading: args.heading,
                lastUpdated: Date.now(),
                isActive: true,
                userName: args.userName,
                color: args.color,
            });
        } else {
            // Create new location entry
            await ctx.db.insert("locations", {
                userId: args.userId,
                userName: args.userName,
                latitude: args.latitude,
                longitude: args.longitude,
                accuracy: args.accuracy,
                speed: args.speed,
                heading: args.heading,
                lastUpdated: Date.now(),
                isActive: true,
                color: args.color,
            });
        }

        // Save to history log
        await ctx.db.insert("location_history", {
            userId: args.userId,
            userName: args.userName,
            latitude: args.latitude,
            longitude: args.longitude,
            accuracy: args.accuracy,
            speed: args.speed,
            heading: args.heading,
            timestamp: Date.now(),
            color: args.color,
        });
    },
});

export const setInactive = mutation({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("locations")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isActive: false,
                lastUpdated: Date.now(),
            });
        }
    },
});


