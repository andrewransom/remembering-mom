"use client";

import { useState } from "react";

const FALLBACK_IMAGE = "/landing-profile-fallback.svg";

type ProfilePortraitProps = {
  src: string;
  alt: string;
};

export function ProfilePortrait({ src, alt }: ProfilePortraitProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = failedSrc === src ? FALLBACK_IMAGE : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="h-auto w-full max-w-sm object-cover md:w-64"
      onError={() => setFailedSrc(src)}
    />
  );
}
