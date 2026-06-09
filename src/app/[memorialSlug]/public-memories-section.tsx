"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type PublicMemoryItem = {
  id: string;
  author_name: string;
  message: string;
  photoUrls: string[];
  created_at: string;
};

type PublicMemoriesSectionProps = {
  memorialName: string;
  memories: PublicMemoryItem[];
};

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const formatDate = (iso: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
};

export function PublicMemoriesSection({ memorialName, memories }: PublicMemoriesSectionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    memoryId: string;
    index: number;
  } | null>(null);

  const selectedMemory = selectedPhoto
    ? memories.find((memory) => memory.id === selectedPhoto.memoryId)
    : null;
  const selectedPhotoUrl = selectedMemory && selectedPhoto ? selectedMemory.photoUrls[selectedPhoto.index] : null;
  const selectedPhotoNumber = selectedPhoto ? selectedPhoto.index + 1 : 1;
  const hasMultipleSelectedPhotos = Boolean(selectedMemory && selectedMemory.photoUrls.length > 1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedPhoto && !dialog.open) {
      dialog.showModal();
    }

    if (!selectedPhoto && dialog.open) {
      dialog.close();
    }
  }, [selectedPhoto]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => setSelectedPhoto(null);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  const showPhotoOffset = useCallback((offset: number) => {
    setSelectedPhoto((currentSelection) => {
      if (!currentSelection) return null;

      const currentMemory = memories.find((memory) => memory.id === currentSelection.memoryId);
      if (!currentMemory || currentMemory.photoUrls.length === 0) return null;

      return {
        memoryId: currentSelection.memoryId,
        index: (currentSelection.index + offset + currentMemory.photoUrls.length) % currentMemory.photoUrls.length,
      };
    });
  }, [memories]);

  useEffect(() => {
    if (!hasMultipleSelectedPhotos) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        showPhotoOffset(-1);
      }

      if (event.key === "ArrowRight") {
        showPhotoOffset(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleSelectedPhotos, showPhotoOffset]);

  return (
    <section className="mt-10 rounded-3xl border border-border/80 bg-card/80 p-6">
      <h2 className="mb-5 text-2xl font-semibold">Memories of {memorialName}</h2>
      <ul className="space-y-4">
        {memories.map((memory) => (
          <li key={memory.id} className="rounded-xl border border-border bg-card/50 p-4">
            <div className="mb-3">
              <p className="break-words text-sm font-medium">{memory.author_name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(memory.created_at)}</p>
            </div>

            <p className="mb-3 whitespace-pre-wrap break-words">{memory.message}</p>

            {memory.photoUrls.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {memory.photoUrls.map((photoUrl, index) => (
                  <button
                    key={photoUrl}
                    type="button"
                    className="group overflow-hidden rounded-lg border border-border bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => setSelectedPhoto({ memoryId: memory.id, index })}
                    aria-label={`Open photo ${index + 1} from ${memory.author_name}`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1} from ${memory.author_name}`}
                      className="h-56 w-full max-w-full object-cover transition group-hover:scale-[1.02] sm:h-64"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Memory photo full view"
        className="m-auto max-h-[100dvh] w-[100dvw] max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black/80"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
      >
        <div
          className="relative flex min-h-[100dvh] items-center justify-center px-4 py-16 sm:px-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              dialogRef.current?.close();
            }
          }}
        >
          <button
            type="button"
            className={`${iconButtonClassName} absolute right-4 top-4`}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close photo"
          >
            <X aria-hidden="true" size={20} />
          </button>

          {hasMultipleSelectedPhotos ? (
            <button
              type="button"
              className={`${iconButtonClassName} absolute left-4 top-1/2 -translate-y-1/2`}
              onClick={() => showPhotoOffset(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft aria-hidden="true" size={24} />
            </button>
          ) : null}

          {selectedPhotoUrl && selectedMemory ? (
            <img
              src={selectedPhotoUrl}
              alt={`Full view of photo ${selectedPhotoNumber} from ${selectedMemory.author_name}`}
              className="max-h-[82dvh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : null}

          {hasMultipleSelectedPhotos ? (
            <button
              type="button"
              className={`${iconButtonClassName} absolute right-4 top-1/2 -translate-y-1/2`}
              onClick={() => showPhotoOffset(1)}
              aria-label="Next photo"
            >
              <ChevronRight aria-hidden="true" size={24} />
            </button>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}
