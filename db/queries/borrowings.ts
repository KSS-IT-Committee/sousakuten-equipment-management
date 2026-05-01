import { db } from "@/lib/db";
import { Borrowings } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function getBorrowings() {
  return await db.select().from(Borrowings);
}

export async function getBorrowingById(id: number) {
  const result = await db
    .select()
    .from(Borrowings)
    .where(eq(Borrowings.id, id));
  return result[0];
}

export async function getBorrowingsByEquipmentId(equipmentId: number) {
  return await db
    .select()
    .from(Borrowings)
    .where(eq(Borrowings.equipmentId, equipmentId));
}

export async function getBorrowingsByClass(classNumber: number) {
  return await db
    .select()
    .from(Borrowings)
    .where(eq(Borrowings.class, classNumber));
}

export async function getActiveBorrowings() {
  const now = new Date();
  return await db
    .select()
    .from(Borrowings)
    .where(isNull(Borrowings.returnedAt));
}

export async function createBorrowing(data: {
  equipmentId: number;
  class: number;
  borrowDate: Date;
  returnDate?: Date;
}) {
  return await db.insert(Borrowings).values(data);
}

export async function returnBorrowing(id: number, returnDate: Date) {
  return await db
    .update(Borrowings)
    .set({ returnedAt: returnDate })
    .where(eq(Borrowings.id, id));
}
