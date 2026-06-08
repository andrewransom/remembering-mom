import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

export const MEMORY_BUCKET = "memories";
export const PROFILE_BUCKET = "profile";
export const PROFILE_PHOTO_FILE_NAME = "main.webp";

export const MEMORY_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<(typeof MEMORY_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type MemoryPhotoValidationResult =
  | {
      ok: true;
      path: string;
      mimeType: (typeof MEMORY_MIME_TYPES)[number];
      size: number;
    }
  | {
      ok: false;
      reason:
        | "photo_missing"
        | "photo_type"
        | "photo_size"
        | "photo_size_or_type";
      details: string;
    };

export const buildProfilePhotoPath = (memorialId: string) => {
  return `${memorialId}/${PROFILE_PHOTO_FILE_NAME}`;
};

export const validateMemoryPhoto = (
  file: File,
  memorialId: string,
): MemoryPhotoValidationResult => {
  if (!file) return { ok: false, reason: "photo_missing", details: "No file provided." };
  if (!MEMORY_MIME_TYPES.includes(file.type as (typeof MEMORY_MIME_TYPES)[number])) {
    return {
      ok: false,
      reason: "photo_type",
      details: `Unsupported MIME type: ${file.type || "(empty)"}`,
    };
  }
  if (file.size > MAX_MEMORY_PHOTO_BYTES) {
    return {
      ok: false,
      reason: "photo_size",
      details: `File too large: ${file.size} bytes, max ${MAX_MEMORY_PHOTO_BYTES}`,
    };
  }

  const extension = EXTENSION_BY_MIME[file.type as keyof typeof EXTENSION_BY_MIME];
  const objectName = `${crypto.randomUUID()}.${extension}`;

  return {
    ok: true,
    path: `${memorialId}/${objectName}`,
    mimeType: file.type as (typeof MEMORY_MIME_TYPES)[number],
    size: file.size,
  };
};

export const buildMemoryPhotoPublicUrl = (
  client: SupabaseClient<Database>,
  photoPath: string,
) => {
  const { data } = client.storage.from(MEMORY_BUCKET).getPublicUrl(photoPath);
  return data.publicUrl;
};

export const buildProfilePhotoPublicUrl = (
  client: SupabaseClient<Database>,
  profilePhotoPath: string,
) => {
  const { data } = client.storage.from(PROFILE_BUCKET).getPublicUrl(profilePhotoPath);
  return data.publicUrl;
};

export const deleteMemoryPhoto = async (
  client: SupabaseClient<Database>,
  photoPath: string | null,
) => {
  if (!photoPath) return { data: null as null, error: null };

  return client.storage.from(MEMORY_BUCKET).remove([photoPath]);
};

export const deleteMemoryPhotos = async (
  client: SupabaseClient<Database>,
  photoPaths: string[],
) => {
  const uniquePaths = Array.from(new Set(photoPaths.filter(Boolean)));
  if (uniquePaths.length === 0) return { data: null as null, error: null };

  return client.storage.from(MEMORY_BUCKET).remove(uniquePaths);
};

export const uploadMemoryPhoto = async (
  client: SupabaseClient<Database>,
  file: File,
  memorialId: string,
) => {
  const validation = validateMemoryPhoto(file, memorialId);
  if (!validation.ok) {
    throw new Error(validation.details);
  }

  const { error } = await client.storage.from(MEMORY_BUCKET).upload(validation.path, file, {
    contentType: validation.mimeType,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  return {
    path: validation.path,
    mimeType: validation.mimeType,
    size: validation.size,
  };
};
