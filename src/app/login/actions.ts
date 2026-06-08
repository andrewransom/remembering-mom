"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = {
  ok: boolean;
  error?: string;
  email?: string;
  notificationId?: string;
};

const createNotificationId = () => crypto.randomUUID();

export const signInWithEmailAndPassword = async (
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> => {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      ok: false,
      error: "Enter both email and password.",
      email,
      notificationId: createNotificationId(),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error.message,
      email,
      notificationId: createNotificationId(),
    };
  }

  redirect("/");
};

export const signOutAction = async () => {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  redirect("/login");
};
