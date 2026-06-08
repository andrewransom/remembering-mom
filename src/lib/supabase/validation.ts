import { Database } from "./types";

export const MAX_MESSAGE_CHARS = {
  memory: 2000,
  condolences: 5000,
} as const;

export const MAX_NAME_CHARS = {
  memoryAuthor: 200,
  condolencesSender: 200,
} as const;

export const MAX_SOURCE_CHARS = 200;

export type NewMemory = Database["public"]["Tables"]["memories"]["Insert"];
export type NewCondolence = Database["public"]["Tables"]["condolences"]["Insert"];

type TextValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string; value: string };

const normalizeText = (value: string) => value.trim();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isValidIsoDate = (value: string) => {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

export const isValidMemorialSlug = (slug: string) => {
  return slug.length >= 2 && slug.length <= 80 && SLUG_RE.test(slug);
};

export const trimAndValidateName = (name: string): TextValidationResult => {
  const trimmed = normalizeText(name);
  if (!trimmed) return { ok: false, reason: "from_name_required", value: "" };
  if (trimmed.length > MAX_NAME_CHARS.condolencesSender) {
    return { ok: false, reason: "from_name_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const trimAndValidateMemoryMessage = (message: string): TextValidationResult => {
  const trimmed = normalizeText(message);
  if (!trimmed) return { ok: false, reason: "memory_message_required", value: "" };
  if (trimmed.length > MAX_MESSAGE_CHARS.memory) {
    return { ok: false, reason: "memory_message_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const trimAndValidateCondolenceMessage = (message: string): TextValidationResult => {
  const trimmed = normalizeText(message);
  if (!trimmed) return { ok: false, reason: "condolence_message_required", value: "" };
  if (trimmed.length > MAX_MESSAGE_CHARS.condolences) {
    return { ok: false, reason: "condolence_message_too_long", value: trimmed };
  }

  return { ok: true, value: trimmed };
};

export const mapInputToMemory = (
  memorialId: string,
  authorName: string,
  message: string,
  photoPaths: string[] = [],
): { ok: true; value: NewMemory } | { ok: false; reason: string } => {
  const normalizedAuthor = normalizeText(authorName);
  if (!normalizedAuthor) return { ok: false, reason: "author_name_required" };
  if (normalizedAuthor.length > MAX_NAME_CHARS.memoryAuthor) {
    return { ok: false, reason: "author_name_too_long" };
  }

  const normalizedMessage = trimAndValidateMemoryMessage(message);
  if (!normalizedMessage.ok) return { ok: false, reason: normalizedMessage.reason };

  return {
    ok: true,
    value: {
      memorial_id: memorialId,
      author_name: normalizedAuthor,
      message: normalizedMessage.value,
      photo_path: photoPaths[0] ?? null,
      photo_paths: photoPaths,
    },
  };
};

export const mapInputToCondolence = (
  memorialId: string,
  fromName: string,
  message: string,
  dateReceived: string | null = null,
  source: string | null = null,
): { ok: true; value: NewCondolence } | { ok: false; reason: string } => {
  const normalizedName = trimAndValidateName(fromName);
  if (!normalizedName.ok) return { ok: false, reason: normalizedName.reason };

  const normalizedMessage = trimAndValidateCondolenceMessage(message);
  if (!normalizedMessage.ok) return { ok: false, reason: normalizedMessage.reason };

  const normalizedDate = dateReceived?.trim() || null;
  if (normalizedDate !== null) {
    if (!isValidIsoDate(normalizedDate)) {
      return { ok: false, reason: "date_received_invalid" };
    }
  }

  const normalizedSource = source?.trim() || null;
  if (normalizedSource && normalizedSource.length > MAX_SOURCE_CHARS) {
    return { ok: false, reason: "source_too_long" };
  }

  return {
    ok: true,
    value: {
      memorial_id: memorialId,
      from_name: normalizedName.value,
      source: normalizedSource,
      message: normalizedMessage.value,
      date_received: normalizedDate,
    },
  };
};
