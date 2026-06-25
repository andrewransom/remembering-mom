import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  try {
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
    };
  } catch {
    // Invalid or stale auth cookies (for example a missing refresh token)
    // should be treated as logged-out rather than failing the render.
    return null;
  }
};

export const requireAuthenticatedUser = async (redirectTo = "/login") => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(redirectTo);
  }

  return user;
};
