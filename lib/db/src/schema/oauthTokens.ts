import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const oauthTokensTable = pgTable("oauth_tokens", {
  provider: text("provider").primaryKey(),
  refreshToken: text("refresh_token").notNull(),
  realmId: text("realm_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertOauthTokenSchema = createInsertSchema(oauthTokensTable).omit({
  updatedAt: true,
});
export type InsertOauthToken = z.infer<typeof insertOauthTokenSchema>;
export type OauthToken = typeof oauthTokensTable.$inferSelect;
