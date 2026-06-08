"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { createCondolence, deleteCondolence, updateCondolence } from "@/lib/supabase/condolences";
import { mapInputToCondolence, isValidMemorialSlug } from "@/lib/supabase/validation";

type CondolenceFieldErrors = {
  from_name?: string;
  source?: string;
  date_received?: string;
  message?: string;
  form?: string;
};

type CondolenceFormValues = {
  condolence_id?: string;
  from_name: string;
  source: string;
  date_received: string;
  message: string;
};

export type CondolenceFormState = {
  ok: boolean;
  errors?: CondolenceFieldErrors;
  values?: CondolenceFormValues;
  message?: string;
  notificationId?: string;
};

export type CondolenceDeleteState = {
  ok: boolean;
  error?: string;
  deletedId?: string | null;
  notificationId?: string;
};

const createNotificationId = () => crypto.randomUUID();

const mapValidationError = (reason: string, dateReceivedValue: string): CondolenceFieldErrors => {
  if (reason === "from_name_required") {
    return { from_name: "Please enter a name." };
  }

  if (reason === "from_name_too_long") {
    return { from_name: "Sender name must be 200 characters or fewer." };
  }

  if (reason === "source_too_long") {
    return { source: "Source must be 200 characters or fewer." };
  }

  if (reason === "condolence_message_required") {
    return { message: "Please enter a message." };
  }

  if (reason === "condolence_message_too_long") {
    return { message: "Message must be 5000 characters or fewer." };
  }

  if (reason === "date_received_invalid") {
    return {
      date_received: dateReceivedValue
        ? "Please enter a valid date (for example, 2026-06-06)."
        : "Date received is invalid.",
    };
  }

  return { form: "Unable to save this condolence right now." };
};

export const createCondolenceAction = async (
  _state: CondolenceFormState,
  formData: FormData,
): Promise<CondolenceFormState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const fromName = String(formData.get("from_name") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const dateReceived = String(formData.get("date_received") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      values: { from_name: fromName, source, date_received: dateReceived, message },
      errors: { form: "Could not identify this memorial." },
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return {
      ok: false,
      values: { from_name: fromName, source, date_received: dateReceived, message },
      errors: { form: "Could not load this memorial." },
    };
  }

  const mapped = mapInputToCondolence(memorial.id, fromName, message, dateReceived || null, source || null);
  if (!mapped.ok) {
    return {
      ok: false,
      values: {
        from_name: fromName,
        source,
        date_received: dateReceived,
        message,
      },
      errors: mapValidationError(mapped.reason, dateReceived),
    };
  }

  const { error } = await createCondolence(
    adminClient,
    memorial.id,
    mapped.value.from_name,
    mapped.value.message,
    mapped.value.date_received,
    mapped.value.source,
  );

  if (error) {
    return {
      ok: false,
      values: {
        from_name: fromName,
        source,
        date_received: dateReceived,
        message,
      },
      errors: {
        form: "Could not save this condolence. Please try again.",
      },
    };
  }

  revalidatePath(`/${memorialSlug}/condolences`);
  return {
    ok: true,
    values: {
      from_name: "",
      source: "",
      date_received: "",
      message: "",
    },
    errors: {},
    message: "Condolence recorded.",
    notificationId: createNotificationId(),
  };
};

export const updateCondolenceAction = async (
  _state: CondolenceFormState,
  formData: FormData,
): Promise<CondolenceFormState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const condolenceId = String(formData.get("condolenceId") || "").trim();
  const fromName = String(formData.get("from_name") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const dateReceived = String(formData.get("date_received") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const values = {
    condolence_id: condolenceId,
    from_name: fromName,
    source,
    date_received: dateReceived,
    message,
  };

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      values,
      errors: { form: "Could not identify this memorial." },
    };
  }

  if (!condolenceId) {
    return {
      ok: false,
      values,
      errors: { form: "Could not identify this condolence." },
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);
  if (memorialError || !memorial) {
    return {
      ok: false,
      values,
      errors: { form: "Could not load this memorial." },
    };
  }

  const mapped = mapInputToCondolence(memorial.id, fromName, message, dateReceived || null, source || null);
  if (!mapped.ok) {
    return {
      ok: false,
      values,
      errors: mapValidationError(mapped.reason, dateReceived),
    };
  }

  const { data, error } = await updateCondolence(
    adminClient,
    memorial.id,
    condolenceId,
    mapped.value.from_name,
    mapped.value.message,
    mapped.value.date_received,
    mapped.value.source,
  );

  if (error || !data) {
    return {
      ok: false,
      values,
      errors: {
        form: "Could not update this condolence. Please try again.",
      },
    };
  }

  revalidatePath(`/${memorialSlug}/condolences`);
  return {
    ok: true,
    values: {
      from_name: "",
      source: "",
      date_received: "",
      message: "",
    },
    errors: {},
    message: "Condolence updated.",
    notificationId: createNotificationId(),
  };
};

export const deleteCondolenceAction = async (
  _state: CondolenceDeleteState,
  formData: FormData,
): Promise<CondolenceDeleteState> => {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const memorialSlug = String(formData.get("memorialSlug") || "").trim();
  const condolenceId = String(formData.get("condolenceId") || "").trim();

  if (!isValidMemorialSlug(memorialSlug)) {
    return {
      ok: false,
      error: "Could not identify this memorial. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  if (!condolenceId) {
    return {
      ok: false,
      error: "Could not identify this condolence. Please retry.",
      notificationId: createNotificationId(),
    };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, memorialSlug);

  if (memorialError || !memorial) {
    return {
      ok: false,
      error: "Could not load this memorial.",
      notificationId: createNotificationId(),
    };
  }

  const { data, error } = await deleteCondolence(adminClient, memorial.id, condolenceId);

  if (error) {
    return {
      ok: false,
      error: "Could not delete this condolence. Please try again.",
      notificationId: createNotificationId(),
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "This condolence no longer exists.",
      notificationId: createNotificationId(),
    };
  }

  revalidatePath(`/${memorialSlug}/condolences`);
  return {
    ok: true,
    deletedId: condolenceId,
    notificationId: createNotificationId(),
  };
};
