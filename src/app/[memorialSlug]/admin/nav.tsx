"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type AdminNavProps = {
  memorialSlug: string;
};

const tabs = [
  { label: "Memories", segment: "memories" },
  { label: "Event", segment: "events" },
  { label: "Settings", segment: "settings" },
] as const;

export function AdminNav({ memorialSlug }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="section-shell pt-6 sm:pt-8" aria-label="Admin navigation">
      <div className="flex justify-center">
        <ul className="flex items-center gap-6 text-sm font-medium">
          {tabs.map((tab, index) => {
            const href = `/${memorialSlug}/admin/${tab.segment}`;
            const isActive = pathname === href;

            return (
              <li key={tab.segment} className="flex items-center gap-6">
                <Link
                  href={href}
                  className={cn(
                    "transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
                {index < tabs.length - 1 ? (
                  <span className="text-muted-foreground">|</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
