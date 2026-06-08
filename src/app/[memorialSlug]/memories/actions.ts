"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import { createMemorySubmission } from "@/lib/supabase/memories";
import { uploadMemoryPhoto, deleteMemoryPhotos } from "@/lib/supabase/storage";
import { trimAndValidateName, trimAndValidateMemoryMessage, isValidMemorialSlug } from "@/lib/supabase/validation";
import {
  createMemoryPreviewToken,
  MEMORY_PREVIEW_COOKIE_NAME,
  MEMORY_PREVIEW_TTL_SECONDS,
} from "@/lib/memory-preview";

const SUBMISSION_WINDOW_MS = 60_000;
const SUBMISSION_LIMIT = 5;
const MAX_PHOTO_COUNT = 12;

type SubmissionWindow = {
  start: number;
  count: number;
};

const submissionRateState = new Map<string, SubmissionWindow>();

const getClientIp = async () => {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return requestHeaders.get("x-real-ip") || "unknown";
};

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const current = submissionRateState.get(ip);

  if (!current) {
    submissionRateState.set(ip, { start: now, count: 1 });
    return false;
  }

  const windowExpired = now - current.start > SUBMISSION_WINDOW_MS;
  if (windowExpired) {
    submissionRateState.set(ip, { start: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > SUBMISSION_LIMIT;
};

type FieldErrors = {
  name?: string;
  message?: string;
  photo?: string;
  form?: string;
};

export type MemorySubmissionState = {
  ok: boolean;
  errors?: FieldErrors;
  values?: {
    name: string;
    message: string;
  };
};

export const submitMemory = async (
  _state: MemorySubmissionState,
  formData: FormData,
): Promise<MemorySubmissionState> => {
  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const honeypot = String(formData.get("website") || "").trim();

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      errors: { form: "This memorial page is not valid." },
      values: { name, message },
    };
  }

  if (honeypot) {
    redirect(`/${memorialSlug}/memories/thank-you`);
  }

  const clientIp = await getClientIp();
  if (isRateLimited(`${memorialSlug}:${clientIp}`)) {
    return {
      ok: false,
      errors: {
        form: "Too many submissions. Please wait a moment before trying again.",
      },
      values: { name, message },
    };
  }

  const nameValidation = trimAndValidateName(name);
  if (!nameValidation.ok) {
    return {
      ok: false,
      errors: {
        name:
          nameValidation.reason === "from_name_required"
            ? "Please enter your name."
            : "Name must be no more than 200 characters.",
      },
      values: { name, message },
    };
  }

  const messageValidation = trimAndValidateMemoryMessage(message);
  if (!messageValidation.ok) {
    return {
      ok: false,
      errors: {
        message:
          messageValidation.reason === "memory_message_required"
            ? "Please add a memory message."
            : "Your memory must be 2000 characters or fewer.",
      },
      values: { name, message },
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getPublishedMemorialBySlug(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return {
      ok: false,
      errors: { form: "This memorial could not be found." },
      values: { name, message },
    };
  }

  const photoCandidates = formData
    .getAll("photos")
    .filter((candidate): candidate is File => candidate instanceof File && candidate.size > 0);
  const uploadedPhotoPaths: string[] = [];

  if (photoCandidates.length > MAX_PHOTO_COUNT) {
    return {
      ok: false,
      errors: {
        photo: `Please choose ${MAX_PHOTO_COUNT} photos or fewer.`,
      },
      values: { name, message },
    };
  }

  try {
    for (const photoCandidate of photoCandidates) {
      const upload = await uploadMemoryPhoto(adminClient, photoCandidate, memorial.id);
      uploadedPhotoPaths.push(upload.path);
    }
  } catch (error) {
    await deleteMemoryPhotos(adminClient, uploadedPhotoPaths);

    return {
      ok: false,
      errors: {
        photo:
          error instanceof Error
            ? error.message
            : "There was a problem uploading your photos.",
      },
      values: { name, message },
    };
  }

  const { data, error: insertError } = await createMemorySubmission(
    adminClient,
    memorial.id,
    nameValidation.value,
    messageValidation.value,
    uploadedPhotoPaths,
  );

  if (insertError || !data?.id) {
    await deleteMemoryPhotos(adminClient, uploadedPhotoPaths);
    const missingPhotoPathsColumn =
      insertError?.code === "42703" && insertError.message.includes("photo_paths");

    return {
      ok: false,
      errors: {
        form: missingPhotoPathsColumn
          ? "We could not save your memory because the database migration for multiple photos has not been applied yet."
          : "We could not save your memory. Please try again.",
      },
      values: { name, message },
    };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: MEMORY_PREVIEW_COOKIE_NAME,
    value: await createMemoryPreviewToken(data.id, memorial.id, memorial.slug),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: `/${memorialSlug}/memories/thank-you`,
    maxAge: MEMORY_PREVIEW_TTL_SECONDS,
  });

  redirect(`/${memorialSlug}/memories/thank-you`);
};
