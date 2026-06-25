"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Menu } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
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

  const authenticatedLinks: LinkConfig[] = [];

  const links = isAuthenticated
    ? [...publicLinks, ...authenticatedLinks]
    : publicLinks;
  const menuAriaLabel = userEmail ? `Open account menu for ${userEmail}` : "Open account menu";
  const closeAccountMenu = () => setMenuOpen(false);

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
                {memorialSlug ? (
                  <details
                    className="relative"
                    open={menuOpen}
                    onToggle={(event) => setMenuOpen(event.currentTarget.open)}
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-center text-foreground/85 transition-colors hover:text-accent"
                      aria-label={menuAriaLabel}
                    >
                      <Menu aria-hidden="true" className="size-4" />
                    </summary>
                    <ul className="absolute right-0 z-20 mt-2 min-w-56 rounded-xl border border-border/80 bg-card p-1 shadow-lg">
                      <li>
                        <Link
                          href={`/${memorialSlug}/condolences`}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                          onClick={closeAccountMenu}
                        >
                          Condolences
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${memorialSlug}/admin/memories`}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                          onClick={closeAccountMenu}
                        >
                          Memories
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${memorialSlug}/admin/events`}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                          onClick={closeAccountMenu}
                        >
                          Event Management
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${memorialSlug}/admin/settings`}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                          onClick={closeAccountMenu}
                        >
                          Settings
                        </Link>
                      </li>
                      <li>
                        <form action={signOutAction}>
                          <button
                            type="submit"
                            className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60"
                            onClick={closeAccountMenu}
                          >
                            Sign Out
                          </button>
                        </form>
                      </li>
                    </ul>
                  </details>
                ) : (
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-foreground/85 transition-colors hover:text-accent"
                    >
                      Sign Out
                    </button>
                  </form>
                )}
              </li>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="text-foreground/85 transition-colors hover:text-accent"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
