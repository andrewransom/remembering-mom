import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/event-format";
import type { EventRow } from "@/lib/supabase/events";

const getMapLink = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!URL.canParse(trimmed)) return null;
  return trimmed;
};

type EventDetailsProps = {
  event: EventRow;
  memorialSlug?: string;
  showRsvpButton?: boolean;
  showLocationMap?: boolean;
};

export function EventDetails({
  event,
  memorialSlug,
  showRsvpButton = false,
  showLocationMap = false,
}: EventDetailsProps) {
  const dateTime = formatEventDateTime(event);
  const mapLink = getMapLink(event.map_link);
  const paragraphs = event.event_description
    ?.split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean) ?? [];

  return (
    <section aria-label="Celebration of Life" className="mt-10 rounded-3xl border border-border/80 bg-card/80 p-6">
      <div className="space-y-5">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">{event.event_title || "Celebration of Life"}</h2>
          {paragraphs.length > 0 ? (
            <div className="space-y-3 text-left text-foreground/85">
              {paragraphs.map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </div>

        {dateTime ? (
          <p className="flex items-start gap-3 text-lg font-semibold text-foreground">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
            <span>{dateTime}</span>
          </p>
        ) : null}

        {event.location ? (
          <div className="space-y-2">
            {showLocationMap && mapLink ? (
              <>
                <div className="flex items-start gap-3 text-base text-foreground">
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open map in a new tab"
                    className="mt-0.5 inline-flex shrink-0 rounded-full p-1 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80"
                  >
                    <MapPin aria-hidden="true" className="size-5 text-accent" />
                  </a>
                  <p className="whitespace-pre-line">{event.location}</p>
                </div>
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open map in a new tab"
                  className="ml-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80"
                >
                  Open map
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </>
            ) : (
              <div className="flex flex-1 items-start gap-3 text-base text-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
                <p className="whitespace-pre-line">{event.location}</p>
              </div>
            )}
            {event.location_notes ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {event.location_notes}
              </p>
            ) : null}
          </div>
        ) : null}

        {showRsvpButton && memorialSlug ? (
          <div className="pt-1 text-center">
            <Link
              href={`/${memorialSlug}/event/rsvp`}
              className={buttonVariants({ size: "lg", className: "w-48" })}
            >
              RSVP
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
