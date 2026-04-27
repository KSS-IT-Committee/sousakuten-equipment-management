import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const Equipments = pgTable("Equipments", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(), 
  name: text("name").notNull(),
  picture: text("picture"),
});

export const Borrowings = pgTable("Borrowings", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id")
    .notNull()
    .references(() => Equipments.id),
  localNumber: integer("local_number").notNull(),
  class: integer("class").notNull(),
  dateBorrowed: timestamp("borrowed_at", { withTimezone: true }).defaultNow().notNull(),
  dateReturned: timestamp("returned_at", { withTimezone: true }),
});
