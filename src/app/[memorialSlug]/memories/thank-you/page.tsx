import Link from "next/link";
import { cookies } from "next/headers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getMemoryByIdForMemorial } from "@/lib/supabase/memories";
import { buildMemoryPhotoPublicUrl } from "@/lib/supabase/storage";
import {
  parseMemoryPreviewToken,
  MEMORY_PREVIEW_COOKIE_NAME,
} from "@/lib/memory-preview";
import { ThankYouPhotoLightbox } from "./thank-you-photo-lightbox";

type ThankYouPageProps = {
  params: Promise<{
    memorialSlug: string;
  }>;
};

type PreviewPageMemory = {
  id: string;
  memorial_id: string;
  author_name: string;
  message: string;
  photo_path: string | null;
  photo_paths: string[];
  created_at: string;
};

const formatDate = (iso: string) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
};

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { memorialSlug } = await params;
  const cookieStore = await cookies();
  const previewToken = cookieStore.get(MEMORY_PREVIEW_COOKIE_NAME)?.value ?? null;
  const validatedToken = await parseMemoryPreviewToken(previewToken);

  let submittedMemory: PreviewPageMemory | null = null;
  let photoUrls: string[] = [];

  if (validatedToken.ok && validatedToken.memorialSlug === memorialSlug) {
    const client = createServerSupabaseAdminClient();
    const { data, error } = await getMemoryByIdForMemorial(
      client,
      validatedToken.memorialId,
      validatedToken.memoryId,
    );

    if (data && !error) {
      submittedMemory = data;
      const photoPaths = Array.from(
        new Set([data.photo_path, ...data.photo_paths].filter((photoPath): photoPath is string => Boolean(photoPath))),
      );
      photoUrls = photoPaths.map((photoPath) => buildMemoryPhotoPublicUrl(client, photoPath));
    }
  }

  return (
    <section className="section-shell py-16 sm:py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {submittedMemory ? "Thank you for sharing" : "Thanks for sharing"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submittedMemory ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Thank you for sharing this memory. It is a gift to those who knew and loved her.
              </p>
              <article className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                  {submittedMemory.author_name} — {formatDate(submittedMemory.created_at)}
                </p>
                <p className="whitespace-pre-wrap">{submittedMemory.message}</p>
                {photoUrls.length > 0 ? (
                  <ThankYouPhotoLightbox
                    authorName={submittedMemory.author_name}
                    photoUrls={photoUrls}
                  />
                ) : null}
              </article>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Thanks for your submission. Your memory has been received.
            </p>
          )}

          <Link
            href={`/${memorialSlug}/memories`}
            className="mt-6 inline-block text-sm text-accent underline"
          >
            Add another memory
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
