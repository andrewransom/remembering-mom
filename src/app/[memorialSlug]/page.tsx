import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import { listApprovedMemoriesForPublic, type PublicMemoryRow } from "@/lib/supabase/memories";
import { buildMemoryPhotoPublicUrl, buildProfilePhotoPublicUrl } from "@/lib/supabase/storage";
import type { DonationLink } from "@/lib/supabase/types";
import { ProfilePhotoLightbox } from "./profile-photo-lightbox";
import { PublicMemoriesSection } from "./public-memories-section";

type MemorialPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

const buildMetadataBase = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return undefined;

  try {
    return URL.canParse(siteUrl) ? new URL(siteUrl) : undefined;
  } catch {
    return undefined;
  }
};

const getMemorial = cache(async (slug: string) => {
  const client = await createServerSupabaseClient();
  const { data, error } = await getPublishedMemorialBySlug(client, slug);

  if (error || !data) return null;

  return { memorial: data, client };
});

const getExternalUrl = (url: string | null | undefined) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl || !URL.canParse(trimmedUrl)) return null;

  const parsedUrl = new URL(trimmedUrl);
  return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? trimmedUrl : null;
};

const LOCAL_PROFILE_PHOTO_FALLBACK = "/jenny-flowers.jpg";

const toPublicMemoryRows = (
  rows: PublicMemoryRow[],
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) => {
  return rows.map((memory) => ({
    id: memory.id,
    author_name: memory.author_name,
    message: memory.message,
    created_at: memory.created_at,
    photoUrls: Array.from(
      new Set([memory.photo_path, ...memory.photo_paths].filter((photoPath): photoPath is string => Boolean(photoPath))),
    ).map((photoPath) => buildMemoryPhotoPublicUrl(client, photoPath)),
  }));
};

export async function generateMetadata({ params }: MemorialPageProps): Promise<Metadata> {
  const { memorialSlug } = await params;
  const result = await getMemorial(memorialSlug);

  if (!result) {
    return {
      title: "Memorial not found",
    };
  }

  const title = `${result.memorial.person_name} · In Loving Memory`;
  const description = `${result.memorial.person_name} - A gentle memorial page honoring a life and inviting memories and support.`;
  const metadataBase = buildMetadataBase();

  return {
    title,
    description,
    ...(metadataBase ? { metadataBase } : {}),
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function MemorialHome({ params }: MemorialPageProps) {
  const { memorialSlug } = await params;
  const result = await getMemorial(memorialSlug);

  if (!result) {
    notFound();
  }

  const { client, memorial } = result;
  const dates = [memorial.birth_date, memorial.death_date].filter(Boolean).join(" - ");
  const profilePhotoUrl = memorial.profile_photo_path
    ? buildProfilePhotoPublicUrl(client, memorial.profile_photo_path)
    : LOCAL_PROFILE_PHOTO_FALLBACK;
  const { data: memoryRows, error: memoriesError } =
    await listApprovedMemoriesForPublic(client, memorial.id);

  if (memoriesError) {
    console.error("Failed to load approved memories for public memorial page", {
      memorialId: memorial.id,
      memorialSlug,
      error: memoriesError,
    });
  }

  const memories = memoryRows ? toPublicMemoryRows(memoryRows, client) : [];

  return (
    <div className="section-shell py-10 sm:py-16">
      <article className="mx-auto w-full max-w-[68ch] pb-4">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            In Loving Memory
          </p>
          <div className="flex justify-center pb-2">
            <ProfilePhotoLightbox
              src={profilePhotoUrl}
              fallbackSrc={LOCAL_PROFILE_PHOTO_FALLBACK}
              personName={memorial.person_name}
            />
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {memorial.person_name}
          </h1>
          {dates ? <p className="text-lg text-muted-foreground">{dates}</p> : null}
          <div className="flex justify-center pt-4">
            <Link
              href={`/${memorialSlug}/memories`}
              className={buttonVariants({ size: "lg" })}
            >
              Share a Memory
            </Link>
          </div>
        </header>

        {memorial.donation_links.length > 0 ? (
          <section aria-label="Donation links" className="mt-10 rounded-3xl border border-border/80 bg-card/80 p-6 text-center">
            <h2 className="mb-2 text-2xl font-semibold">In lieu of flowers</h2>
            <p className="mb-4 text-muted-foreground">
              Please consider donating to one of the following charities that were important to Jenny.
            </p>
            <ul className="space-y-4">
              {memorial.donation_links.map((donation: DonationLink, donationIndex) => {
                const linkName = donation.link.name || "Donate";
                const donationUrl = getExternalUrl(donation.link.url);

                return (
                  <li key={`${donation.link.url}-${donationIndex}`} className="space-y-3">
                    <ul className="divide-y divide-border/70 text-left">
                      {donation.details.map((detail, detailIndex) => {
                        const detailInfoUrl = getExternalUrl(detail.info_link);

                        return (
                          <li key={`${detail.name}-${detailIndex}`} className="space-y-1 py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-base font-medium text-foreground">{detail.name}</h3>
                              {detailInfoUrl ? (
                                <a
                                  href={detailInfoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`More information about ${detail.name} (opens in a new tab)`}
                                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                                >
                                  <Info aria-hidden="true" className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{detail.description}</p>
                          </li>
                        );
                      })}
                    </ul>
                    {donationUrl ? <div className="border-t border-border/70 pt-3" aria-hidden="true" /> : null}
                    {donationUrl ? (
                      <a
                        href={donationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${linkName} (opens in a new tab)`}
                        className={`${buttonVariants({ size: "lg" })} gap-2 shadow-md`}
                      >
                        <span>{linkName}</span>
                        <ExternalLink aria-hidden="true" className="size-4" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

      </article>

      {memories.length > 0 ? (
        <PublicMemoriesSection
          memorialName={memorial.person_name}
          memories={memories}
        />
      ) : null}
    </div>
  );
}
