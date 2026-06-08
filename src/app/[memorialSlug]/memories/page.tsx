"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { submitMemory, type MemorySubmissionState } from "./actions";

const initialState: MemorySubmissionState = {
  ok: true,
  errors: {},
  values: {
    name: "",
    message: "",
  },
};

const fieldInputClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const fieldErrorClassName = "text-sm text-[#7b2f2f]";

type PhotoPreview = {
  id: string;
  name: string;
  url: string;
};

const getPhotoId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export default function MemoriesPage() {
  const params = useParams<{ memorialSlug: string }>();
  const memorialSlug = params.memorialSlug;
  const [state, formAction] = useActionState(submitMemory, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const nameValue = state.values?.name ?? "";
  const messageValue = state.values?.message ?? "";

  const syncFileInput = (files: File[]) => {
    if (!fileInputRef.current) return;

    const transfer = new DataTransfer();
    files.forEach((file) => {
      transfer.items.add(file);
    });
    fileInputRef.current.files = transfer.files;
  };

  const updatePhotoSelection = (files: File[]) => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];

    syncFileInput(files);
    setSelectedPhotos(files);

    const previews = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);

      return {
        id: getPhotoId(file),
        name: file.name,
        url,
      };
    });

    setPhotoPreviews(previews);
  };

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
      }
    };

    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);

    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addPhotos = (files: FileList | null) => {
    const newPhotos = files ? Array.from(files).filter((file) => file.type.startsWith("image/")) : [];
    if (newPhotos.length === 0) return;

    const existingIds = new Set(selectedPhotos.map(getPhotoId));
    const uniqueNewPhotos = newPhotos.filter((file) => !existingIds.has(getPhotoId(file)));
    updatePhotoSelection([...selectedPhotos, ...uniqueNewPhotos]);
  };

  return (
    <section className="section-shell py-16 sm:py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Share a Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" action={formAction}>
            <input type="hidden" name="memorialSlug" value={memorialSlug} />

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={200}
                autoComplete="name"
                className={fieldInputClassName}
                placeholder="How you'd like to be known"
                defaultValue={nameValue}
              />
              {state.errors?.name ? (
                <p className={fieldErrorClassName}>{state.errors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Memory
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                maxLength={2000}
                className={`${fieldInputClassName} min-h-[160px]`}
                placeholder="Write your memory here."
                defaultValue={messageValue}
              />
              {state.errors?.message ? (
                <p className={fieldErrorClassName}>{state.errors.message}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <span className="text-sm font-medium">Photos</span>
              <label
                htmlFor="photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/70 px-6 py-8 text-center transition hover:border-accent/70 hover:bg-muted/40"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  addPhotos(event.dataTransfer.files);
                }}
              >
                <UploadCloud aria-hidden="true" className="mb-3 h-8 w-8 text-accent" />
                <span className="text-sm font-medium">Drop photos here or choose files</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, or WebP. Up to 12 photos, 10 MB each.
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="photos"
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => addPhotos(event.target.files)}
              />
              {photoPreviews.length > 0 ? (
                <div className="grid gap-3 rounded-xl border border-border bg-card/60 p-3 sm:grid-cols-2">
                  {photoPreviews.map((photo) => (
                    <figure key={photo.id} className="overflow-hidden rounded-lg border border-border bg-card/80">
                      <img
                        src={photo.url}
                        alt=""
                        className="h-36 w-full object-cover"
                      />
                      <figcaption className="truncate px-3 py-2 text-xs text-muted-foreground">
                        {photo.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
              {state.errors?.photo ? (
                <p className={fieldErrorClassName}>{state.errors.photo}</p>
              ) : null}
            </div>

            <div className="sr-only" aria-hidden>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                autoComplete="off"
                tabIndex={-1}
                className="h-0 w-0 overflow-hidden"
              />
            </div>

            {state.errors?.form ? (
              <p className={fieldErrorClassName}>{state.errors.form}</p>
            ) : null}

            <Button type="submit">Share this memory</Button>
          </form>

          <Link href={`/${memorialSlug}`} className="mt-8 inline-block text-sm text-accent underline">
            Return home
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
