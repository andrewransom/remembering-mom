import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";
import { mapInputToCondolence } from "./validation";

export type CondolenceSortMode = "date" | "name";
type CondolenceRow = Database["public"]["Tables"]["condolences"]["Row"];

export const listCondolencesAdmin = (
  client: SupabaseClient<Database>,
  memorialId: string,
  sort: CondolenceSortMode = "date",
  limit = 100,
) => {
  const query = client
    .from("condolences")
    .select("id, memorial_id, from_name, source, message, date_received, created_at")
    .eq("memorial_id", memorialId)
    .order("created_at", { ascending: false });

  if (sort === "name") {
    return query.order("from_name", { ascending: true }).limit(limit).returns<CondolenceRow[]>();
  }

  return query.limit(limit).returns<CondolenceRow[]>();
};

export const createCondolence = (
  client: SupabaseClient<Database>,
  memorialId: string,
  fromName: string,
  message: string,
  dateReceived: string | null = null,
  source: string | null = null,
) => {
  const mapped = mapInputToCondolence(memorialId, fromName, message, dateReceived, source);
  if (!mapped.ok) {
    throw new Error(mapped.reason);
  }

  return client
    .from("condolences")
    .insert([mapped.value])
    .select("id")
    .returns<Pick<CondolenceRow, "id">[]>()
    .maybeSingle();
};

export const updateCondolence = (
  client: SupabaseClient<Database>,
  memorialId: string,
  condolenceId: string,
  fromName: string,
  message: string,
  dateReceived: string | null = null,
  source: string | null = null,
) => {
  const mapped = mapInputToCondolence(memorialId, fromName, message, dateReceived, source);
  if (!mapped.ok) {
    throw new Error(mapped.reason);
  }

  return client
    .from("condolences")
    .update(mapped.value)
    .eq("id", condolenceId)
    .eq("memorial_id", memorialId)
    .select("id")
    .returns<Pick<CondolenceRow, "id">[]>()
    .maybeSingle();
};

export const deleteCondolence = (
  client: SupabaseClient<Database>,
  memorialId: string,
  condolenceId: string,
) => {
  return client
    .from("condolences")
    .delete()
    .eq("id", condolenceId)
    .eq("memorial_id", memorialId)
    .select("id")
    .returns<Pick<CondolenceRow, "id">[]>();
};
