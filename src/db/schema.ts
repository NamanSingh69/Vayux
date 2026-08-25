import { pgTable, integer, text, real, timestamp } from "drizzle-orm/pg-core";

// Bare minimum 
export const testForecasts = pgTable("test_forecasts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  locationName: text("location_name").notNull(), 
  aqi: real("aqi"),
  createdAt: timestamp("created_at").defaultNow(),
});