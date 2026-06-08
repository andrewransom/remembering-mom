import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ensureClientConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public client environment variables");
  }

  if (new URL(supabaseUrl).pathname !== "/") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, not a REST or Auth endpoint");
  }

  return { url: supabaseUrl, anonKey: supabaseAnonKey };
};

export const createBrowserSupabaseClient = () => {
  const { url, anonKey } = ensureClientConfig();
  return createBrowserClient<Database>(url, anonKey);
};
