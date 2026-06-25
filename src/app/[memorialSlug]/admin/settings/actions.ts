"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/lib/auth";
import { isValidEventTimeZone } from "@/lib/event-format";
import { upsertEvent, upsertEventPrivateDetails } from "@/lib/supabase/events";
import { getMemorialBySlugAdmin } from "@/lib/supabase/memorials";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import type { DonationLink } from "@/lib/supabase/types";
import { isValidIsoDate, isValidMemorialSlug } from "@/lib/supabase/validation";

export type MemorialUpdatePayload = {
  person_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  user_first_name?: string | null;
  user_last_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  bio?: string | null;
  tribute_paragraphs?: string[];
  donation_links: string;
  is_published: boolean;
};

export type MemorialSettingsResult = {
  error?: string;
};

export type EventSettingsPayload = {
  event_title?: string | null;
  event_description?: string | null;
  event_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  time_zone?: string | null;
  location?: string | null;
  location_notes?: string | null;
  map_link?: string | null;
  livestream_link?: string | null;
  livestream_instructions?: string | null;
  is_published: boolean;
};

export type SettingsSaveResult = {
  memorialRowError?: string;
  userMetadataError?: string;
  eventError?: string;
};

const optionalText = (value: string | null | undefined) => value?.trim() || null;

const joinName = (...parts: (string | null | undefined)[]) => {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
};

const optionalJoinedName = (...parts: (string | null | undefined)[]) => {
  return joinName(...parts) || null;
};

const normalizeDonationLinks = (rawLinks: string) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawLinks || "[]");
  } catch {
    return { error: "Invalid donation links" };
  }

  if (!Array.isArray(parsed)) {
    return { error: "Invalid donation links" };
  }

  const links: DonationLink[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;

    const linkContainer = item as {
      link?: { name?: unknown; url?: unknown };
      details?: unknown;
    };
    const url = typeof linkContainer.link?.url === "string"
      ? linkContainer.link.url.trim()
      : "";

    if (!url) continue;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { error: `Donation link URL is invalid: ${url}` };
      }
    } catch {
      return { error: `Donation link URL is invalid: ${url}` };
    }

    const details = Array.isArray(linkContainer.details)
      ? linkContainer.details
          .map((detail): DonationLink["details"][number] | null => {
            if (!detail || typeof detail !== "object") return null;
            const detailObject = detail as {
              name?: unknown;
              description?: unknown;
              info_link?: unknown;
            };
            const name = typeof detailObject.name === "string" ? detailObject.name.trim() : "";
            const description = typeof detailObject.description === "string"
              ? detailObject.description.trim()
              : "";
            const infoLink = typeof detailObject.info_link === "string"
              ? detailObject.info_link.trim()
              : "";

            if (!name && !description) return null;

            return {
              name,
              description,
              info_link: infoLink || null,
            };
          })
          .filter((detail): detail is DonationLink["details"][number] => Boolean(detail))
      : [];

    links.push({
      link: {
        name: typeof linkContainer.link?.name === "string"
          ? linkContainer.link.name.trim()
          : "",
        url,
      },
      details,
    });
  }

  return { links };
};

const buildMemorialUpdate = (data: MemorialUpdatePayload) => {
  const firstName = optionalText(data.first_name);
  const lastName = optionalText(data.last_name);
  const userFirstName = optionalText(data.user_first_name);
  const userLastName = optionalText(data.user_last_name);
  const defaultDisplayName = optionalJoinedName(firstName, lastName) || firstName;
  const displayName = optionalText(data.display_name) ?? defaultDisplayName;
  const fullName = optionalText(data.full_name);
  const personName = fullName
    ?? optionalJoinedName(firstName, lastName)
    ?? displayName
    ?? data.person_name?.trim()
    ?? "";

  if (!personName) {
    return { error: "A name is required." };
  }

  if (!Array.isArray(data.tribute_paragraphs)) {
    return { error: "Tribute paragraphs are invalid." };
  }

  const normalizedDonationLinks = normalizeDonationLinks(data.donation_links);
  if ("error" in normalizedDonationLinks) {
    return { error: normalizedDonationLinks.error };
  }

  return {
    userFirstName,
    userLastName,
    payload: {
      person_name: personName,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      full_name: fullName,
      birth_date: optionalText(data.birth_date),
      death_date: optionalText(data.death_date),
      bio: optionalText(data.bio),
      tribute_paragraphs: data.tribute_paragraphs
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      donation_links: normalizedDonationLinks.links ?? [],
      is_published: data.is_published,
    },
  };
};

const buildEventUpdate = (data: EventSettingsPayload) => {
  const eventDate = optionalText(data.event_date);
  if (eventDate && !isValidIsoDate(eventDate)) {
    return { error: "Please enter a valid event date." };
  }

  const mapLink = optionalText(data.map_link);
  if (mapLink && !URL.canParse(mapLink)) {
    return { error: "Please enter a valid map link." };
  }

  const timeZone = optionalText(data.time_zone);
  if (timeZone && !isValidEventTimeZone(timeZone)) {
    return { error: "Please choose a valid time zone." };
  }

  return {
    eventPayload: {
      event_title: optionalText(data.event_title),
      event_description: optionalText(data.event_description),
      event_date: eventDate,
      event_start_time: optionalText(data.event_start_time),
      event_end_time: optionalText(data.event_end_time),
      time_zone: timeZone,
      location: optionalText(data.location),
      location_notes: optionalText(data.location_notes),
      map_link: mapLink,
      is_published: data.is_published,
    },
    privatePayload: {
      livestream_link: optionalText(data.livestream_link),
      livestream_instructions: optionalText(data.livestream_instructions),
    },
  };
};

export async function updateMemorialSettingsAction(
  slug: string,
  data: MemorialUpdatePayload,
): Promise<MemorialSettingsResult> {
  const user = await requireAuthenticatedUser();

  if (!isValidMemorialSlug(slug)) {
    return { error: "Could not identify this memorial." };
  }

  const normalizedMemorial = buildMemorialUpdate(data);
  if ("error" in normalizedMemorial) {
    return { error: normalizedMemorial.error };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, slug);

  if (memorialError || !memorial) {
    return { error: "Could not load this memorial." };
  }

  const { error } = await adminClient
    .from("memorials")
    .update(normalizedMemorial.payload)
    .eq("id", memorial.id);

  if (error) {
    return { error: "Could not save settings. Please try again." };
  }

  const existingAuthUser = await adminClient.auth.admin.getUserById(user.id);
  if (existingAuthUser.error || !existingAuthUser.data.user) {
    return { error: "Could not update your user profile." };
  }

  const currentMetadata = existingAuthUser.data.user.user_metadata ?? {};
  const nextMetadata = typeof currentMetadata === "object" && currentMetadata !== null
    ? { ...currentMetadata, first_name: normalizedMemorial.userFirstName, last_name: normalizedMemorial.userLastName }
    : { first_name: normalizedMemorial.userFirstName, last_name: normalizedMemorial.userLastName };

  const authUserUpdate = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });

  if (authUserUpdate.error) {
    return { error: "Could not save your name. Please try again." };
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/about`);
  revalidatePath(`/${slug}/admin/settings`);

  return {};
}

export async function updateMemorialAndEventSettingsAction(
  slug: string,
  memorialData: MemorialUpdatePayload,
  eventData: EventSettingsPayload,
): Promise<SettingsSaveResult> {
  const user = await requireAuthenticatedUser();

  if (!isValidMemorialSlug(slug)) {
    const error = "Could not identify this memorial.";
    return { memorialRowError: error, eventError: error };
  }

  const normalizedMemorial = buildMemorialUpdate(memorialData);
  if ("error" in normalizedMemorial) {
    return { memorialRowError: normalizedMemorial.error };
  }

  const adminClient = createServerSupabaseAdminClient();
  const { data: memorial, error: memorialError } = await getMemorialBySlugAdmin(adminClient, slug);

  if (memorialError || !memorial) {
    return { memorialRowError: "Could not load this memorial." };
  }

  const { error: memorialUpdateError } = await adminClient
    .from("memorials")
    .update(normalizedMemorial.payload)
    .eq("id", memorial.id);

  if (memorialUpdateError) {
    return { memorialRowError: "Could not save memorial settings. Please try again." };
  }

  const result: SettingsSaveResult = {};
  const existingAuthUser = await adminClient.auth.admin.getUserById(user.id);
  if (existingAuthUser.error || !existingAuthUser.data.user) {
    result.userMetadataError = "Could not load your user profile.";
  } else {
    const currentMetadata = existingAuthUser.data.user.user_metadata ?? {};
    const nextMetadata = typeof currentMetadata === "object" && currentMetadata !== null
      ? {
          ...currentMetadata,
          first_name: normalizedMemorial.userFirstName,
          last_name: normalizedMemorial.userLastName,
        }
      : {
          first_name: normalizedMemorial.userFirstName,
          last_name: normalizedMemorial.userLastName,
        };

    const authUserUpdate = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    });

    if (authUserUpdate.error) {
      result.userMetadataError = "Could not save your name. Please try again.";
    }
  }

  const normalizedEvent = buildEventUpdate(eventData);
  if ("error" in normalizedEvent) {
    result.eventError = normalizedEvent.error;
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/about`);
    revalidatePath(`/${slug}/admin/settings`);
    revalidatePath(`/${slug}/admin/events`);
    return result;
  }

  const { data: event, error: eventError } = await upsertEvent(
    adminClient,
    memorial.id,
    normalizedEvent.eventPayload,
  );

  if (eventError || !event) {
    result.eventError = "Could not save event details. Please try again.";
  } else {
    const { error: privateDetailsError } = await upsertEventPrivateDetails(
      adminClient,
      event.id,
      normalizedEvent.privatePayload,
    );

    if (privateDetailsError) {
      result.eventError = "Could not save private event details. Please try again.";
    }
  }

  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/about`);
  revalidatePath(`/${slug}/event/rsvp`);
  revalidatePath(`/${slug}/admin/settings`);
  revalidatePath(`/${slug}/admin/events`);

  return result;
}
