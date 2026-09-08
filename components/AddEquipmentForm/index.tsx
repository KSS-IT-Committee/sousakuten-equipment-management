// AddEquipmentForm.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createEquipmentAction, updateEquipmentAction } from "./action";
import styles from "./AddEquipmentForm.module.css";

type EquipmentFormMode = "create" | "edit";

type EquipmentFormValues = {
  id?: number;
  name: string;
  quantity: number;
  picture?: string | null;
};

type AddEquipmentFormProps = {
  mode?: EquipmentFormMode;
  initialValues?: EquipmentFormValues;
};

export function AddEquipmentForm({
  mode = "create",
  initialValues,
}: AddEquipmentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const initialPreview =
    typeof initialValues?.picture === "string" ? initialValues.picture : "";
  const [imagePreview, setImagePreview] = useState<string>(initialPreview);
  const [isImageDeleted, setIsImageDeleted] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError("画像サイズは4MB以下にしてください。");
      e.target.value = "";
      setImagePreview(initialPreview);
      return;
    }

    setIsImageDeleted(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    setIsImageDeleted(true);
    if (formRef.current) {
      const fileInput = formRef.current.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);

      let result;
      if (mode === "edit" && initialValues?.id) {
        formData.set("equipmentId", String(initialValues.id));
        formData.set(
          "existingPicture",
          isImageDeleted ? "" : (initialValues.picture ?? ""),
        );

        result = await updateEquipmentAction(formData);
      } else {
        result = await createEquipmentAction(formData);
      }

      // The actions report failures as a value rather than throwing: a thrown
      // error would reach production as React's generic "An error occurred in
      // the Server Components render…" text instead of the message below (#190).
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  const isValidPreview =
    imagePreview &&
    typeof imagePreview === "string" &&
    !imagePreview.startsWith("[object");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
      {mode === "edit" && initialValues?.id ? (
        <input type="hidden" name="equipmentId" value={initialValues.id} />
      ) : null}

      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          機器名 <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="例: プロジェクター"
          className={styles.input}
          defaultValue={initialValues?.name ?? ""}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="quantity" className={styles.label}>
          数量 <span className={styles.required}>*</span>
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          placeholder="例: 5"
          className={styles.input}
          min="1"
          defaultValue={initialValues?.quantity ?? ""}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="picture" className={styles.label}>
          機器画像を追加（オプション）
        </label>
        <input
          type="file"
          id="picture"
          name="picture"
          accept="image/*"
          onChange={handleImageChange}
          className={styles.fileInput}
        />

        {isValidPreview ? (
          <div
            className={styles.previewContainer}
            style={{ marginTop: "15px" }}
          >
            <p
              className={styles.previewLabel}
              style={{ fontSize: "14px", color: "#666" }}
            >
              選択中のプレビュー:
            </p>
            <div
              style={{
                width: 120,
                height: 120,
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #ccc",
              }}
            >
              <Image
                src={imagePreview}
                alt="Equipment Preview"
                fill
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginTop: "5px",
                fontSize: "12px",
                color: "#ff4d4f",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              画像を削除
            </button>
          </div>
        ) : null}
      </div>

      {error && (
        <div
          className={styles.error}
          style={{ color: "#ff4d4f", marginBottom: "15px" }}
        >
          {error}
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading
            ? mode === "edit"
              ? "修正中..."
              : "追加中..."
            : mode === "edit"
              ? "修正する"
              : "機器を追加"}
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => router.push("/")}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
