"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { deleteMemoryWithPhoto, updateMemoryApproval, updateMemoryText } from "@/lib/supabase/memories";
import { isValidMemorialSlug, mapInputToMemory } from "@/lib/supabase/validation";

export type MemoryDeleteState = {
  ok: boolean;
  error?: string;
  deletedId?: string | null;
  notificationId?: string;
};

export type MemoryApprovalState = {
  ok: boolean;
  error?: string;
  memoryId?: string | null;
  isApproved?: boolean;
  notificationId?: string;
};

type MemoryFormErrors = {
  author_name?: string;
  message?: string;
  form?: string;
};

type MemoryFormValues = {
  memory_id?: string;
  author_name: string;
  message: string;
};

export type MemoryFormState = {
  ok: boolean;
  errors?: MemoryFormErrors;
  values?: MemoryFormValues;
  message?: string;
  notificationId?: string;
};

const createNotificationId = () => crypto.randomUUID();

const mapMemoryValidationError = (reason: string): MemoryFormErrors => {
  if (reason === "author_name_required") {
    return { author_name: "Please enter a name." };
  }

  if (reason === "author_name_too_long") {
    return { author_name: "Name must be 200 characters or fewer." };
  }

  if (reason === "memory_message_required") {
    return { message: "Please enter a memory." };
  }

  if (reason === "memory_message_too_long") {
    return { message: "Memory must be 2000 characters or fewer." };
  }

  return { form: "Unable to save this memory right now." };
};

export const deleteMemoryAction = async (
  _state: MemoryDeleteState,
  formData: FormData,
): Promise<MemoryDeleteState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const memoryId = String(formData.get("memoryId") || "").trim();

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      error: "Could not identify memorial. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  if (!memoryId) {
    return {
      ok: false,
      error: "Could not identify memory. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    return {
      ok: false,
      error: "Could not load this memorial.",
      notificationId: createNotificationId(),
    };
  }

  const { fetchError, deleteError, storageResult, deletedRows } =
    await deleteMemoryWithPhoto(adminClient, memorial.id, memoryId);

  if (fetchError) {
    return {
      ok: false,
      error: "Could not load the selected memory.",
      notificationId: createNotificationId(),
    };
  }

  if (storageResult?.error) {
    return {
      ok: false,
      error: "Could not delete photo attachment. Memory was not removed.",
      notificationId: createNotificationId(),
    };
  }

  if (deleteError) {
    return {
      ok: false,
      error: "Could not remove memory. Please try again.",
      notificationId: createNotificationId(),
    };
  }

  if (!deletedRows || deletedRows.length === 0) {
    return {
      ok: false,
      error: "Memory no longer exists.",
      notificationId: createNotificationId(),
    };
  }

  revalidatePath(`/${memorialSlug}/admin/memories`);
  return {
    ok: true,
    deletedId: memoryId,
    notificationId: createNotificationId(),
  };
};

export const updateMemoryApprovalAction = async (
  _state: MemoryApprovalState,
  formData: FormData,
): Promise<MemoryApprovalState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const memoryId = String(formData.get("memoryId") || "").trim();
  const isApproved = String(formData.get("isApproved") || "") === "true";

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      error: "Could not identify memorial. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  if (!memoryId) {
    return {
      ok: false,
      error: "Could not identify memory. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    return {
      ok: false,
      error: "Could not load this memorial.",
      notificationId: createNotificationId(),
    };
  }

  const { data: memory, error } = await updateMemoryApproval(adminClient, memorial.id, memoryId, isApproved);

  if (error || !memory) {
    return {
      ok: false,
      error: "Could not update approval. Please try again.",
      notificationId: createNotificationId(),
    };
  }

  revalidatePath(`/${memorialSlug}/admin/memories`);
  return {
    ok: true,
    memoryId,
    isApproved,
    notificationId: createNotificationId(),
  };
};

export const updateMemoryAction = async (
  _state: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const memoryId = String(formData.get("memoryId") || "").trim();
  const authorName = String(formData.get("author_name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const values = {
    memory_id: memoryId,
    author_name: authorName,
    message,
  };

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      values,
      errors: { form: "Could not identify this memorial." },
      notificationId: createNotificationId(),
    };
  }

  if (!memoryId) {
    return {
      ok: false,
      values,
      errors: { form: "Could not identify this memory." },
      notificationId: createNotificationId(),
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return {
      ok: false,
      values,
      errors: { form: "Could not load this memorial." },
      notificationId: createNotificationId(),
    };
  }

  const mapped = mapInputToMemory(memorial.id, authorName, message);
  if (!mapped.ok) {
    return {
      ok: false,
      values,
      errors: mapMemoryValidationError(mapped.reason),
      notificationId: createNotificationId(),
    };
  }

  const { data, error } = await updateMemoryText(
    adminClient,
    memorial.id,
    memoryId,
    mapped.value.author_name,
    mapped.value.message,
  );

  if (error || !data) {
    return {
      ok: false,
      values,
      errors: {
        form: "Could not update this memory. Please try again.",
      },
      notificationId: createNotificationId(),
    };
  }

  revalidatePath(`/${memorialSlug}/admin/memories`);
  return {
    ok: true,
    values: {
      author_name: "",
      message: "",
    },
    errors: {},
    message: "Memory updated.",
    notificationId: createNotificationId(),
  };
};
