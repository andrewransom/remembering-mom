"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type ProfilePhotoLightboxProps = {
  personName: string;
  src: string;
};

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function ProfilePhotoLightbox({ personName, src }: ProfilePhotoLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => setIsOpen(false);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        onClick={() => setIsOpen(true)}
        aria-label={`Open full profile photo of ${personName}`}
      >
        <Image
          src={src}
          alt={`Flowers in memory of ${personName}`}
          width={176}
          height={176}
          priority
          className="h-36 w-36 rounded-full border border-border object-cover shadow-sm transition group-hover:brightness-95 sm:h-44 sm:w-44"
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Full profile photo of ${personName}`}
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
            aria-label="Close profile photo"
          >
            <X aria-hidden="true" size={20} />
          </button>

          <Image
            src={src}
            alt={`Full profile photo of ${personName}`}
            width={1200}
            height={1600}
            className="max-h-[82dvh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      </dialog>
    </>
  );
}
