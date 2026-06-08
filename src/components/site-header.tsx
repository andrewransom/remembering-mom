"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { signOutAction } from "@/app/login/actions";

type LinkConfig = {
  href: string;
  label: string;
};

type SiteHeaderProps = {
  isAuthenticated?: boolean;
  userEmail?: string | null;
};

export function SiteHeader({
  isAuthenticated = false,
  userEmail = null,
}: SiteHeaderProps) {
  const params = useParams();
  const rawMemorialSlug = params.memorialSlug;
  const memorialSlug =
    typeof rawMemorialSlug === "string" ? rawMemorialSlug : null;

  const publicLinks: LinkConfig[] = memorialSlug
    ? [
        { href: `/${memorialSlug}`, label: "Home" },
        { href: `/${memorialSlug}/memories`, label: "Share a memory" },
      ]
    : [{ href: "/", label: "Home" }];

  const authenticatedLinks: LinkConfig[] = memorialSlug
    ? [
        { href: `/${memorialSlug}/condolences`, label: "Condolences" },
        { href: `/${memorialSlug}/admin/memories`, label: "Memories" },
      ]
    : [];

  const links = isAuthenticated
    ? [...publicLinks, ...authenticatedLinks]
    : publicLinks;

  return (
    <header className="border-b border-border">
      <div className="section-shell flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-serif font-semibold tracking-tight">
          Remembering
        </Link>
        <nav aria-label="Primary">
          <ul className="flex flex-wrap gap-4 text-sm font-medium sm:gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-foreground/85 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isAuthenticated ? (
              <li>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-foreground/85 transition-colors hover:text-accent"
                  >
                    {userEmail ? `Sign out ${userEmail}` : "Sign out"}
                  </button>
                </form>
              </li>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="text-foreground/85 transition-colors hover:text-accent"
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
