import { eq } from "drizzle-orm";

import { Equipments } from "@/db/schema";
import { db } from "@/lib/db";

export async function getEquipments() {
  return await db.select().from(Equipments);
}

export async function getEquipmentById(id: number) {
  const result = await db
    .select()
    .from(Equipments)
    .where(eq(Equipments.id, id));
  return result[0];
}

export async function createEquipment(data: {
  name: string;
  quantity: number;
  picture?: string;
}) {
  return await db.insert(Equipments).values(data);
  // if picture is empty, set default
}
