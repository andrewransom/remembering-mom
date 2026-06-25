import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
  appendCacheVersion,
  buildProfilePhotoPath,
  buildProfilePhotoPublicUrl,
  buildSecondaryPhotoPath,
  getMemorialPhotoExtension,
  MAX_MEMORIAL_PHOTO_BYTES,
  MEMORIAL_PHOTO_MIME_TYPES,
  PROFILE_BUCKET,
} from "@/lib/supabase/storage";
import { isValidMemorialSlug } from "@/lib/supabase/validation";

type PhotoType = "profile" | "secondary";

const isPhotoType = (value: FormDataEntryValue | null): value is PhotoType => {
  return value === "profile" || value === "secondary";
};

const jsonError = (error: string, status: number) => {
  return NextResponse.json({ error }, { status });
};

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid upload request", 400);
  }
  const file = formData.get("file");
  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const photoTypeValue = formData.get("photoType");

  if (!isValidMemorialSlug(memorialSlug) || !isPhotoType(photoTypeValue)) {
    return jsonError("Invalid upload request", 400);
  }

  if (!(file instanceof File)) {
    return jsonError("Photo must be a JPEG, PNG, or WebP image under 10 MB", 400);
  }

  const extension = getMemorialPhotoExtension(file.type);
  if (!extension || file.size > MAX_MEMORIAL_PHOTO_BYTES) {
    return jsonError("Photo must be a JPEG, PNG, or WebP image under 10 MB", 400);
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    return jsonError("Not found", 404);
  }

  const path = photoTypeValue === "profile"
    ? buildProfilePhotoPath(memorial.id, extension)
    : buildSecondaryPhotoPath(memorial.id, extension);
  const existingPath = photoTypeValue === "profile"
    ? memorial.profile_photo_path
    : memorial.secondary_photo_path;
  const hadExistingPath = Boolean(existingPath);

  const { error: uploadError } = await adminClient.storage
    .from(PROFILE_BUCKET)
    .upload(path, file, {
      contentType: file.type as (typeof MEMORIAL_PHOTO_MIME_TYPES)[number],
      upsert: true,
    });

  if (uploadError) {
    return jsonError(uploadError.message, 400);
  }

  const { error: updateError } = await adminClient
    .from("memorials")
    .update(
      photoTypeValue === "profile"
        ? { profile_photo_path: path }
        : { secondary_photo_path: path },
    )
    .eq("id", memorial.id);

  if (updateError) {
    if (!hadExistingPath) {
      await adminClient.storage.from(PROFILE_BUCKET).remove([path]);
    } else {
      console.error("Photo upload DB update failed after replacing existing object", {
        memorialId: memorial.id,
        memorialSlug,
        photoType: photoTypeValue,
        error: updateError,
      });
    }

    return jsonError(updateError.message, 400);
  }

  if (existingPath && existingPath !== path) {
    await adminClient.storage.from(PROFILE_BUCKET).remove([existingPath]);
  }

  revalidatePath(`/${memorialSlug}`);
  revalidatePath(`/${memorialSlug}/about`);

  return NextResponse.json({
    path,
    publicUrl: appendCacheVersion(
      buildProfilePhotoPublicUrl(adminClient, path),
      Date.now(),
    ),
  });
}
