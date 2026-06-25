import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listPublishedMemorials, type MemorialRow } from "@/lib/supabase/memorials";
import { Toast } from "@/components/ui/toast";

export default async function Home() {
  const client = await createServerSupabaseClient();
  const { data: memorials, error } = await listPublishedMemorials(client);

  return (
    <section className="section-shell py-16 sm:py-20">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            Memorials
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Remembering loved ones
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Choose a memorial to read the tribute or share a memory.
          </p>
        </header>

        {error ? <Toast id="memorials-load-error" message="Memorials could not be loaded yet." tone="error" /> : null}

        {!error && memorials?.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            No published memorials have been added yet.
          </p>
        ) : null}

        <ul className="space-y-4">
          {memorials?.map((memorial: MemorialRow) => {
            const displayName = memorial.display_name?.trim() || memorial.person_name;

            return (
              <li key={memorial.id}>
                <Link
                  href={`/${memorial.slug}`}
                  className="block rounded-2xl border border-border bg-card p-6 transition hover:border-accent/60"
                >
                  <h2 className="text-2xl font-semibold">{displayName}</h2>
                  <p className="mt-1 text-muted-foreground">
                    {[memorial.birth_date, memorial.death_date].filter(Boolean).join(" - ") || "Memorial page"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
