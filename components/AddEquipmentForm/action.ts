// action.ts
"use server";

import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import fs from "fs/promises";
import { revalidatePath } from "next/cache";
import path from "path";

import { getActiveBorrowingsByEquipmentId } from "@/db/queries/borrowings";
import {
  countEquipmentsByPicture,
  createEquipment,
  getEquipmentById,
  updateEquipment,
} from "@/db/queries/equipments";
import { Borrowings, Equipments } from "@/db/schema";
import { isAdmin } from "@/lib/authorize";
import { db } from "@/lib/db";
import {
  ALLOWED_IMAGE_LABEL,
  detectImageType,
  equipmentImagesDir,
  IMAGE_URL_PREFIX,
} from "@/lib/equipment-images";

/**
 * A failure the user can act on (bad input, a rule they hit). Thrown inside the
 * actions below and turned into `{ success: false, error }` before it leaves the
 * server, so the Japanese text actually reaches the form.
 *
 * Anything else is a bug: it is logged on the server and reported to the user as
 * a generic message, never as a raw driver/runtime string.
 */
class EquipmentValidationError extends Error {}

export type EquipmentActionResult =
  { success: true } | { success: false; error: string };

/**
 * Server Actions must not *throw* user-facing messages: React replaces every
 * thrown error with the fixed "An error occurred in the Server Components
 * render…" string in production builds, so the message the user sees locally is
 * not the one they see in production (#190). Returning the failure as a value
 * keeps it intact.
 */
function toActionResult(err: unknown): EquipmentActionResult {
  if (err instanceof EquipmentValidationError) {
    return { success: false, error: err.message };
  }
  console.error("備品の操作に失敗しました:", err);
  return { success: false, error: "処理中にエラーが発生しました" };
}

async function saveImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0 || file.name === "undefined") return null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate by content (magic bytes), not by extension, so a disguised payload
  // such as an SVG/HTML file can never be stored and later served same-origin.
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new EquipmentValidationError(
      `対応していない画像形式です（${ALLOWED_IMAGE_LABEL}のみ）`,
    );
  }

  const dir = equipmentImagesDir();
  await fs.mkdir(dir, { recursive: true });

  // Keep a sanitized stem from the original name for readability, but force the
  // canonical extension from the detected type so the on-disk name always
  // reflects real content. Embedding the SHA-256 of the bytes makes the name
  // content-addressed: two uploads can only ever collide on a name when their
  // bytes are identical, so a given URL always maps to one byte sequence.
  // That — not mere improbability of a clash — is what lets the serving route
  // (app/equipment-images/[name]/route.ts) mark these URLs immutable (#149).
  // The timestamp only keeps directory listings chronological. basename()
  // strips any path components so the upload can never escape the images dir.
  const sanitized = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const stem = sanitized.replace(/\.[^.]+$/, "") || "image";
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const uniqueFilename = `${Date.now()}-${contentHash}-${stem}${detected.ext}`;
  const filePath = path.join(dir, uniqueFilename);

  await fs.writeFile(filePath, buffer);

  return `${IMAGE_URL_PREFIX}${uniqueFilename}`;
}

/**
 * Delete an uploaded image file from disk, but only when it is one of ours and
 * no equipment row references it anymore. This is what makes image cleanup safe:
 * a path still shared by another equipment is left untouched, so we never delete
 * an image out from under a record that is still using it.
 */
async function deleteImageIfUnreferenced(
  picturePath: string | null,
): Promise<void> {
  // Only manage files we host under /equipment-images/. Leave base64 data URIs,
  // external URLs, or any other value alone.
  if (!picturePath || !picturePath.startsWith(IMAGE_URL_PREFIX)) return;

  // Still referenced elsewhere? Keep the file.
  const refCount = await countEquipmentsByPicture(picturePath);
  if (refCount > 0) return;

  const dir = path.resolve(equipmentImagesDir());
  // basename() drops any directory parts, so the result can only ever resolve
  // to a file directly inside the images directory — no traversal possible.
  const filePath = path.resolve(dir, path.basename(picturePath));
  if (path.dirname(filePath) !== dir) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    // An already-missing file is fine; surface anything else without failing
    // the request the user just completed.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("画像ファイルの削除に失敗しました:", err);
    }
  }
}

export async function createEquipmentAction(
  formData: FormData,
): Promise<EquipmentActionResult> {
  try {
    if (!(await isAdmin())) {
      throw new EquipmentValidationError(
        "この操作には創作展委員の権限が必要です",
      );
    }

    const name = String(formData.get("name") ?? "").trim();
    const quantity = Number(formData.get("quantity"));
    const pictureFile = formData.get("picture") as File | null;

    if (!name) {
      throw new EquipmentValidationError("備品名を入力してください");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new EquipmentValidationError("数量は1以上の整数で入力してください");
    }

    const picture = await saveImage(pictureFile);

    await createEquipment({ name, quantity, picture });

    revalidatePath("/equipment");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function updateEquipmentAction(
  formData: FormData,
): Promise<EquipmentActionResult> {
  try {
    if (!(await isAdmin())) {
      throw new EquipmentValidationError(
        "この操作には創作展委員の権限が必要です",
      );
    }

    const equipmentId = Number(formData.get("equipmentId"));
    const name = String(formData.get("name") ?? "").trim();
    const quantity = Number(formData.get("quantity"));
    const pictureFile = formData.get("picture") as File | null;
    const existingPicture = String(formData.get("existingPicture") ?? "");

    if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
      throw new EquipmentValidationError("備品IDが不正です");
    }

    const existingEquipment = await getEquipmentById(equipmentId);
    if (!existingEquipment) {
      throw new EquipmentValidationError("備品が見つかりませんでした");
    }

    if (!name) {
      throw new EquipmentValidationError("備品名を入力してください");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new EquipmentValidationError("数量は1以上の整数で入力してください");
    }

    const activeBorrowings =
      await getActiveBorrowingsByEquipmentId(equipmentId);
    if (quantity < activeBorrowings.length) {
      throw new EquipmentValidationError(
        `現在貸出中の数 (${activeBorrowings.length}件) を下回る数量には変更できません`,
      );
    }

    // The picture stored before this edit, used to decide on file cleanup.
    const oldPicture = existingEquipment.picture;

    // Resolve the new picture: a freshly uploaded file wins; otherwise keep what
    // the form carried back (the existing path, or "" when the user removed it).
    let newPicture: string | null;
    if (pictureFile && pictureFile.size > 0) {
      newPicture = await saveImage(pictureFile);
    } else {
      newPicture = existingPicture.length > 0 ? existingPicture : null;
    }

    await updateEquipment(equipmentId, {
      name,
      quantity,
      picture: newPicture,
    });

    // Only clean up when the picture actually changed (replaced or cleared). When
    // the image is left untouched, oldPicture === newPicture and nothing is
    // deleted — this is the fix for the image disappearing on an unrelated edit.
    if (oldPicture && oldPicture !== newPicture) {
      await deleteImageIfUnreferenced(oldPicture);
    }

    revalidatePath("/equipment");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return toActionResult(err);
  }
}

export async function deleteEquipmentAction(
  equipmentId: number,
): Promise<EquipmentActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "この操作には創作展委員の権限が必要です" };
  }
  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return { success: false, error: "備品IDが不正です" };
  }

  try {
    await db.transaction(async (tx) => {
      const [existingEquipment] = await tx
        .select()
        .from(Equipments)
        .where(
          and(eq(Equipments.id, equipmentId), eq(Equipments.deleted, false)),
        )
        .for("update");

      if (!existingEquipment) {
        throw new EquipmentValidationError("備品が見つかりませんでした");
      }

      const activeBorrowings = await tx
        .select({ id: Borrowings.id })
        .from(Borrowings)
        .where(
          and(
            eq(Borrowings.equipmentId, equipmentId),
            isNull(Borrowings.returnedAt),
          ),
        );
      if (activeBorrowings.length > 0) {
        throw new EquipmentValidationError("貸出中の備品は削除できません");
      }

      await tx
        .update(Equipments)
        .set({ deleted: true })
        .where(eq(Equipments.id, equipmentId));
    });

    revalidatePath("/equipment");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return toActionResult(err);
  }
}
