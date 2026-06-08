"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ThankYouPhotoLightboxProps = {
  authorName: string;
  photoUrls: string[];
};

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function ThankYouPhotoLightbox({
  authorName,
  photoUrls,
}: ThankYouPhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedPhotoUrl = selectedIndex === null ? null : photoUrls[selectedIndex];
  const hasMultiplePhotos = photoUrls.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedIndex !== null && !dialog.open) {
      dialog.showModal();
    }

    if (selectedIndex === null && dialog.open) {
      dialog.close();
    }
  }, [selectedIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => setSelectedIndex(null);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  useEffect(() => {
    if (!hasMultiplePhotos || selectedIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null) return null;
          return (currentIndex - 1 + photoUrls.length) % photoUrls.length;
        });
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null) return null;
          return (currentIndex + 1) % photoUrls.length;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultiplePhotos, photoUrls.length, selectedIndex]);

  const showPreviousPhoto = () => {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return null;
      return (currentIndex - 1 + photoUrls.length) % photoUrls.length;
    });
  };

  const showNextPhoto = () => {
    setSelectedIndex((currentIndex) => {
      if (currentIndex === null) return null;
      return (currentIndex + 1) % photoUrls.length;
    });
  };

  if (photoUrls.length === 0) return null;

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {photoUrls.map((photoUrl, index) => (
          <button
            key={photoUrl}
            type="button"
            className="group overflow-hidden rounded-xl border border-border bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setSelectedIndex(index)}
            aria-label={`Open photo ${index + 1} from ${authorName}`}
          >
            <img
              src={photoUrl}
              alt={`Photo ${index + 1} from ${authorName}`}
              className="h-64 w-full object-cover transition group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Photo full view"
        className="m-auto max-h-[100dvh] w-[100dvw] max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black/80"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-16 sm:px-8">
          <button
            type="button"
            className={`${iconButtonClassName} absolute right-4 top-4`}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close photo"
          >
            <X aria-hidden="true" size={20} />
          </button>

          {hasMultiplePhotos ? (
            <button
              type="button"
              className={`${iconButtonClassName} absolute left-4 top-1/2 -translate-y-1/2`}
              onClick={showPreviousPhoto}
              aria-label="Previous photo"
            >
              <ChevronLeft aria-hidden="true" size={24} />
            </button>
          ) : null}

          {selectedPhotoUrl ? (
            <img
              src={selectedPhotoUrl}
              alt={`Full view of photo ${(selectedIndex ?? 0) + 1} from ${authorName}`}
              className="max-h-[82dvh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : null}

          {hasMultiplePhotos ? (
            <button
              type="button"
              className={`${iconButtonClassName} absolute right-4 top-1/2 -translate-y-1/2`}
              onClick={showNextPhoto}
              aria-label="Next photo"
            >
              <ChevronRight aria-hidden="true" size={24} />
            </button>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
