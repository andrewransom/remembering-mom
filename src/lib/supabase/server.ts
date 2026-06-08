import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { Database } from "./types";

const ensureBrowserLikeConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public client environment variables");
  }

  if (new URL(supabaseUrl).pathname !== "/") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, not a REST or Auth endpoint");
  }

  return { url: supabaseUrl, anonKey: supabaseAnonKey };
};

export async function createServerSupabaseClient() {
  const { url, anonKey } = ensureBrowserLikeConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown> | undefined) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components cannot mutate cookies. Middleware/Server Actions handle writes.
        }
      },
      remove(name: string, options: Record<string, unknown> | undefined) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Server Components cannot mutate cookies. Middleware/Server Actions handle writes.
        }
      },
    },
  });
}

export function createServerSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  if (new URL(supabaseUrl).pathname !== "/") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be the Supabase project URL, not a REST or Auth endpoint");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        apikey: supabaseServiceRoleKey,
      },
    },
  });
}
