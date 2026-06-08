import { notFound } from "next/navigation";
import { AdminMemoriesClient } from "./admin-memories-client";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { listRecentMemoriesForModeration } from "@/lib/supabase/memories";
import { buildMemoryPhotoPublicUrl } from "@/lib/supabase/storage";
import { Toast } from "@/components/ui/toast";

type AdminMemoriesPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

const toClientRows = (
  rows: {
    id: string;
    memorial_id: string;
    author_name: string;
    message: string;
    photo_path: string | null;
    photo_paths: string[];
    is_approved: boolean;
    created_at: string;
  }[],
  adminClient: ReturnType<typeof createServerSupabaseAdminClient>,
) => {
  return rows.map((memory) => ({
    ...memory,
    photoUrls: Array.from(
      new Set([memory.photo_path, ...memory.photo_paths].filter((photoPath): photoPath is string => Boolean(photoPath))),
    ).map((photoPath) =>
      buildMemoryPhotoPublicUrl(adminClient, photoPath),
    ),
  }));
};

export default async function AdminMemoriesPage({ params }: AdminMemoriesPageProps) {
  const { memorialSlug } = await params;
  await requireAuthenticatedUser();

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    notFound();
  }

  const { data: memoryRows, error } = await listRecentMemoriesForModeration(adminClient, memorial.id, 100);

  if (error || !memoryRows) {
    return (
      <section className="section-shell py-16 sm:py-20">
        <Toast id="memories-load-error" message="We could not load memories yet. Please try again." tone="error" />
      </section>
    );
  }

  const memories = toClientRows(memoryRows, adminClient);

  return (
    <AdminMemoriesClient
      memorialSlug={memorial.slug}
      memorialName={memorial.person_name}
      memories={memories}
    />
  );
}
