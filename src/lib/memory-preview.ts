export const MEMORY_PREVIEW_COOKIE_NAME = "remembering-memories-preview";
export const MEMORY_PREVIEW_TTL_SECONDS = 60 * 10;

export type MemoryPreviewValidationResult =
  | {
      ok: true;
      memoryId: string;
      memorialId: string;
      memorialSlug: string;
      expiresAt: number;
    }
  | {
      ok: false;
      reason: "invalid" | "expired" | "empty";
    };

type MemoryPreviewPayload = {
  v: 2;
  id: string;
  mid: string;
  slug: string;
  exp: number;
};

const getPreviewSecret = () => {
  const previewSecret =
    process.env.PREVIEW_COOKIE_SECRET ||
    process.env.MEMORY_PREVIEW_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!previewSecret) {
    throw new Error(
      "Missing PREVIEW_COOKIE_SECRET for memory preview tokens.",
    );
  }

  return previewSecret;
};

const base64UrlEncodeBytes = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

const decodeBase64Url = (value: string) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

const encodeBase64Url = (value: string) => {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
};

const signPayload = async (payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getPreviewSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
};

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
};

const nowMs = () => Date.now();

export const createMemoryPreviewToken = async (
  memoryId: string,
  memorialId: string,
  memorialSlug: string,
) => {
  const now = nowMs();
  const payload: MemoryPreviewPayload = {
    v: 2,
    id: memoryId,
    mid: memorialId,
    slug: memorialSlug,
    exp: now + MEMORY_PREVIEW_TTL_SECONDS * 1000,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const parseMemoryPreviewToken = async (
  token: string | undefined | null,
): Promise<MemoryPreviewValidationResult> => {
  if (!token) return { ok: false, reason: "empty" };

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { ok: false, reason: "invalid" };

  const expectedSignature = await signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "invalid" };
  }

  let payloadJson = "";
  try {
    payloadJson = decodeBase64Url(encodedPayload);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  let payload: MemoryPreviewPayload | null = null;
  try {
    payload = JSON.parse(payloadJson) as MemoryPreviewPayload;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!payload || payload.v !== 2 || !payload.id || !payload.mid || !payload.slug || !payload.exp) {
    return { ok: false, reason: "invalid" };
  }

  if (nowMs() > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    memoryId: payload.id,
    memorialId: payload.mid,
    memorialSlug: payload.slug,
    expiresAt: payload.exp,
  };
};
