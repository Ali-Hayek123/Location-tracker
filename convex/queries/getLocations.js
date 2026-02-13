import { query } from "../_generated/server";

export const getLocations = query({
    args: {},
    handler: async (ctx) => {
        // Get all active locations
        const locations = await ctx.db
            .query("locations")
            .collect();

        return locations;
    },
});

export const getActiveLocations = query({
    args: {},
    handler: async (ctx) => {
        const locations = await ctx.db
            .query("locations")
            .collect();

        // Filter to only active locations (updated in last 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return locations.filter(
            (loc) => loc.isActive && loc.lastUpdated > fiveMinutesAgo
        );
    },
});
