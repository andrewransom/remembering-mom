import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublishedMemorialBySlug } from "@/lib/supabase/memorials";
import type { DonationLink } from "@/lib/supabase/types";
import { ProfilePhotoLightbox } from "./profile-photo-lightbox";

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

  const { memorial } = result;
  const dates = [memorial.birth_date, memorial.death_date].filter(Boolean).join(" - ");

  return (
    <div className="section-shell py-10 sm:py-16">
      <article className="mx-auto w-full max-w-[68ch] pb-4">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            In Loving Memory
          </p>
          <div className="flex justify-center pb-2">
            <ProfilePhotoLightbox
              src="/jenny-flowers.jpg"
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
            <h2 className="mb-2 text-2xl font-semibold">Support in remembrance</h2>
            <p className="mb-4 text-muted-foreground">
              If you would like to support causes meaningful to her, here are donation options.
            </p>
            <ul className="space-y-4">
              {memorial.donation_links.map((donation: DonationLink) => (
                <li key={donation.url} className="space-y-1">
                  <a
                    href={donation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${donation.organizationName} (opens in a new tab)`}
                    className="inline-flex items-center justify-center gap-1 text-lg text-accent underline-offset-4 transition hover:text-accent/80 hover:underline"
                  >
                    <span>{donation.organizationName}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                  <p className="text-sm text-muted-foreground">{donation.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
