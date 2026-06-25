import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth";
import { getEventByMemorialId } from "@/lib/supabase/events";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
  appendCacheVersion,
  buildProfilePhotoPublicUrl,
} from "@/lib/supabase/storage";
import { SettingsForm } from "./settings-form";

type SettingsPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { memorialSlug } = await params;
  const currentUser = await requireAuthenticatedUser();

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (error || !memorial) {
    notFound();
  }

  const profilePhotoUrl = memorial.profile_photo_path
    ? appendCacheVersion(
        buildProfilePhotoPublicUrl(adminClient, memorial.profile_photo_path),
        memorial.updated_at,
      )
    : null;
  const secondaryPhotoUrl = memorial.secondary_photo_path
    ? appendCacheVersion(
        buildProfilePhotoPublicUrl(adminClient, memorial.secondary_photo_path),
        memorial.updated_at,
      )
    : null;
  const { data: authUserResult } = await adminClient.auth.admin.getUserById(currentUser.id);
  const { data: event } = await getEventByMemorialId(adminClient, memorial.id);
  const authUserMetadata = authUserResult?.user?.user_metadata;
  const userFirstName = typeof authUserMetadata?.first_name === "string"
    ? authUserMetadata.first_name.trim()
    : null;
  const userLastName = typeof authUserMetadata?.last_name === "string"
    ? authUserMetadata.last_name.trim()
    : null;

  return (
    <section className="section-shell pb-16 sm:pb-20">
      <SettingsForm
        memorial={memorial}
        profilePhotoUrl={profilePhotoUrl}
        secondaryPhotoUrl={secondaryPhotoUrl}
        event={event ?? null}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </section>
  );
}
