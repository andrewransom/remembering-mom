import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

export type MemorialRow = Database["public"]["Tables"]["memorials"]["Row"];

export const listPublishedMemorials = (client: SupabaseClient<Database>) => {
  return client
    .from("memorials")
    .select("id, slug, person_name, first_name, last_name, display_name, full_name, birth_date, death_date, bio, tribute_paragraphs, donation_links, profile_photo_path, secondary_photo_path, is_published, created_at, updated_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .returns<MemorialRow[]>();
};

export const getPublishedMemorialBySlug = (
  client: SupabaseClient<Database>,
  slug: string,
) => {
  return client
    .from("memorials")
    .select("id, slug, person_name, first_name, last_name, display_name, full_name, birth_date, death_date, bio, tribute_paragraphs, donation_links, profile_photo_path, secondary_photo_path, is_published, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .returns<MemorialRow[]>()
    .maybeSingle();
};

export const getMemorialBySlugAdmin = (
  client: SupabaseClient<Database>,
  slug: string,
) => {
  return client
    .from("memorials")
    .select("id, slug, person_name, first_name, last_name, display_name, full_name, birth_date, death_date, bio, tribute_paragraphs, donation_links, profile_photo_path, secondary_photo_path, is_published, created_at, updated_at")
    .eq("slug", slug)
    .returns<MemorialRow[]>()
    .maybeSingle();
};
