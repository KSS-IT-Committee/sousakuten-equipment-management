import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const Equipments = pgTable("Equipments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(), 
  picture: text("picture"),
});

export const Borrowings = pgTable("Borrowings", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id")
    .notNull()
    .references(() => Equipments.id),
  tagNumber: integer("tag_number").notNull(),
  class: integer("class").notNull(),
  borrowedAt: timestamp("borrowed_at", { withTimezone: true }).defaultNow().notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
});
