import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import {
  appendCacheVersion,
  buildProfilePhotoPublicUrl,
} from "@/lib/supabase/storage";

type AboutPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

const splitBioParagraphs = (bio: string | null) => {
  return (bio ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { memorialSlug } = await params;
  const client = await createServerSupabaseClient();
  const { data: memorial, error } = await getPublishedMemorialBySlug(client, memorialSlug);

  if (error || !memorial) {
    notFound();
  }

  const dates = [memorial.birth_date, memorial.death_date].filter(Boolean).join(" - ");
  const fullName = memorial.full_name?.trim()
    || [memorial.first_name, memorial.last_name].map((part) => part?.trim()).filter(Boolean).join(" ")
    || memorial.person_name;
  const paragraphs = splitBioParagraphs(memorial.bio);
  const secondaryPhotoUrl = memorial.secondary_photo_path
    ? appendCacheVersion(
        buildProfilePhotoPublicUrl(client, memorial.secondary_photo_path),
        memorial.updated_at,
      )
    : null;

  return (
    <article className="section-shell py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[56rem]">
        <Link
          href={`/${memorialSlug}`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:brightness-90"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </Link>

        <header className="mb-8 space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            In Loving Memory
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {fullName}
          </h1>
          {dates ? <p className="text-lg text-muted-foreground">{dates}</p> : null}
        </header>

        <div className="text-lg leading-8 text-foreground/90">
          {secondaryPhotoUrl ? (
            <img
              src={secondaryPhotoUrl}
              alt={fullName}
              className="mb-6 w-full rounded-2xl border border-border object-cover shadow-sm sm:float-right sm:ml-8 sm:max-w-[22rem]"
            />
          ) : null}

          {paragraphs.length > 0 ? (
            <div className="space-y-5">
              {paragraphs.map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No bio has been added yet.</p>
          )}
        </div>
      </div>
    </article>
  );
}
