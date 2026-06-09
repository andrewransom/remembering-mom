import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";
import { mapInputToMemory } from "./validation";
import { deleteMemoryPhotos } from "./storage";

type MemoryRow = Database["public"]["Tables"]["memories"]["Row"];

export type PublicMemoryRow = Pick<
  MemoryRow,
  "id" | "memorial_id" | "author_name" | "message" | "photo_path" | "photo_paths" | "created_at"
>;

export const listRecentMemoriesForModeration = (
  client: SupabaseClient<Database>,
  memorialId: string,
  limit = 50,
) => {
  return client
    .from("memories")
    .select("id, memorial_id, author_name, message, photo_path, photo_paths, is_approved, created_at")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<MemoryRow[]>();
};

export const listApprovedMemoriesForPublic = (
  client: SupabaseClient<Database>,
  memorialId: string,
) => {
  return client
    .from("memories")
    .select("id, memorial_id, author_name, message, photo_path, photo_paths, created_at")
    .eq("memorial_id", memorialId)
    .eq("is_approved", true)
    .order("created_at", { ascending: true })
    .limit(100)
    .returns<PublicMemoryRow[]>();
};

export const createMemorySubmission = (
  client: SupabaseClient<Database>,
  memorialId: string,
  authorName: string,
  message: string,
  photoPaths: string[] = [],
) => {
  const mapped = mapInputToMemory(memorialId, authorName, message, photoPaths);
  if (!mapped.ok) {
    throw new Error(mapped.reason);
  }

  return client
    .from("memories")
    .insert([mapped.value])
    .select("id, memorial_id")
    .returns<Pick<MemoryRow, "id" | "memorial_id">[]>()
    .maybeSingle();
};

export const getMemoryByIdForMemorial = (
  client: SupabaseClient<Database>,
  memorialId: string,
  memoryId: string,
) => {
  return client
    .from("memories")
    .select("id, memorial_id, author_name, message, photo_path, photo_paths, is_approved, created_at")
    .eq("id", memoryId)
    .eq("memorial_id", memorialId)
    .returns<MemoryRow[]>()
    .maybeSingle();
};

export const deleteMemoryWithPhoto = async (
  client: SupabaseClient<Database>,
  memorialId: string,
  memoryId: string,
) => {
  const { data: currentRows, error: fetchError } = await client
    .from("memories")
    .select("photo_path, photo_paths")
    .eq("id", memoryId)
    .eq("memorial_id", memorialId)
    .returns<Pick<MemoryRow, "photo_path" | "photo_paths">[]>()
    .maybeSingle();

  if (fetchError) {
    return { deletedRows: null, fetchError, deleteError: null, storageResult: null };
  }

  const photoPaths = currentRows
    ? Array.from(
        new Set(
          [currentRows.photo_path, ...currentRows.photo_paths].filter(
            (photoPath): photoPath is string => Boolean(photoPath),
          ),
        ),
      )
    : [];

  if (photoPaths.length > 0) {
    const storageResult = await deleteMemoryPhotos(client, photoPaths);
    if (storageResult.error) {
      return {
        deletedRows: null,
        fetchError: null,
        deleteError: storageResult.error,
        storageResult,
      };
    }
  }

  const { data: deletedRows, error: deleteError } = await client
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("memorial_id", memorialId)
    .select("id, memorial_id, author_name, message, photo_path, photo_paths, is_approved, created_at")
    .returns<MemoryRow[]>();

  return { deletedRows, fetchError: null, deleteError, storageResult: null };
};

export const updateMemoryApproval = (
  client: SupabaseClient<Database>,
  memorialId: string,
  memoryId: string,
  isApproved: boolean,
) => {
  return client
    .from("memories")
    .update({ is_approved: isApproved })
    .eq("id", memoryId)
    .eq("memorial_id", memorialId)
    .select("id, memorial_id, is_approved")
    .returns<Pick<MemoryRow, "id" | "memorial_id" | "is_approved">[]>()
    .maybeSingle();
};

export const updateMemoryText = (
  client: SupabaseClient<Database>,
  memorialId: string,
  memoryId: string,
  authorName: string,
  message: string,
) => {
  const mapped = mapInputToMemory(memorialId, authorName, message);
  if (!mapped.ok) {
    throw new Error(mapped.reason);
  }

  return client
    .from("memories")
    .update({
      author_name: mapped.value.author_name,
      message: mapped.value.message,
    })
    .eq("id", memoryId)
    .eq("memorial_id", memorialId)
    .select("id, memorial_id, author_name, message")
    .returns<Pick<MemoryRow, "id" | "memorial_id" | "author_name" | "message">[]>()
    .maybeSingle();
};
