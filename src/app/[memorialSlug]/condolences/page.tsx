import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import {
  CondolenceSortMode,
  listCondolencesAdmin,
} from "@/lib/supabase/condolences";
import { CondolencesClient } from "./condolences-client";
import { Toast } from "@/components/ui/toast";

type CondolencePageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
  searchParams?: Promise<{
    sort?: string;
  }>;
};

type CondolenceRow = {
  id: string;
  memorial_id: string;
  from_name: string;
  source: string | null;
  date_received: string | null;
  message: string;
  created_at: string;
};

const toSortMode = (value?: string): CondolenceSortMode => {
  return value === "name" ? "name" : "date";
};

const getDateSortValue = (row: CondolenceRow) => {
  if (row.date_received) {
    return row.date_received;
  }

  return row.created_at.slice(0, 10);
};

const sortCondolences = (rows: CondolenceRow[], sort: CondolenceSortMode) => {
  const sorted = [...rows];

  if (sort === "name") {
    return sorted.sort((a, b) => {
      const nameCompare = a.from_name.localeCompare(b.from_name, "en-US", { sensitivity: "base" });
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }

  return sorted.sort((a, b) => {
    const aSort = getDateSortValue(a);
    const bSort = getDateSortValue(b);

    if (aSort !== bSort) {
      return bSort.localeCompare(aSort);
    }

    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
};

export default async function CondolencesPage({ params, searchParams }: CondolencePageProps) {
  const { memorialSlug } = await params;
  await requireAuthenticatedUser();

  const resolvedSearchParams = await searchParams;
  const sort = toSortMode(resolvedSearchParams?.sort);
  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    notFound();
  }

  const { data: rows, error } = await listCondolencesAdmin(adminClient, memorial.id, sort, 200);

  if (error || !rows) {
    return (
      <section className="section-shell py-16 sm:py-20">
        <Toast id="condolences-load-error" message="We could not load condolences yet. Please try again." tone="error" />
      </section>
    );
  }

  const condolences = sortCondolences(rows, sort);

  return (
    <CondolencesClient
      memorialSlug={memorial.slug}
      memorialName={memorial.person_name}
      condolences={condolences}
      initialSort={sort}
    />
  );
}
