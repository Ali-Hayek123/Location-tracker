import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const addMessage = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    await ctx.db.insert("messages", { text, createdAt: Date.now() });
  },
});
