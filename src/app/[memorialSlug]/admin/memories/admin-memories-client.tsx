"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Square, SquareCheckBig, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  deleteMemoryAction,
  updateMemoryAction,
  updateMemoryApprovalAction,
  type MemoryApprovalState,
  type MemoryDeleteState,
  type MemoryFormState,
} from "./actions";

type AdminMemoryItem = {
  id: string;
  memorial_id: string;
  author_name: string;
  message: string;
  photoUrls: string[];
  is_approved: boolean;
  created_at: string;
};

type AdminMemoriesClientProps = {
  memorialSlug: string;
  memorialName: string;
  memories: AdminMemoryItem[];
};

const initialState: MemoryDeleteState = {
  ok: false,
  error: undefined,
};

const initialApprovalState: MemoryApprovalState = {
  ok: false,
  error: undefined,
};

const initialFormState: MemoryFormState = {
  ok: true,
  values: {
    author_name: "",
    message: "",
  },
  errors: {},
};

const fieldInputClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const fieldErrorClassName = "text-sm text-[#7b2f2f]";

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const formatDate = (iso: string) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
};

export function AdminMemoriesClient({ memorialSlug, memorialName, memories }: AdminMemoriesClientProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const [editingMemory, setEditingMemory] = useState<AdminMemoryItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    memoryId: string;
    index: number;
  } | null>(null);
  const [updateState, updateFormAction, updatePending] = useActionState(updateMemoryAction, initialFormState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteMemoryAction, initialState);
  const [approvalState, approvalFormAction, approvalPending] = useActionState(
    updateMemoryApprovalAction,
    initialApprovalState,
  );
  const activeValues =
    updateState.values?.memory_id === editingMemory?.id
      ? updateState.values
      : undefined;
  const activeErrors =
    updateState.values?.memory_id === editingMemory?.id
      ? updateState.errors
      : undefined;
  const authorName = activeValues?.author_name ?? editingMemory?.author_name ?? "";
  const memoryMessage = activeValues?.message ?? editingMemory?.message ?? "";
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

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;

    const handleClose = () => setEditingMemory(null);
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

  const openEditDialog = (memory: AdminMemoryItem) => {
    setEditingMemory(memory);
    if (!editDialogRef.current?.open) {
      editDialogRef.current?.showModal();
    }
  };

  useEffect(() => {
    if (!updateState.ok && updateState.errors) {
      if (!editDialogRef.current?.open) {
        editDialogRef.current?.showModal();
      }
    }

    if (updateState.ok && updateState.message) {
      editDialogRef.current?.close();
    }
  }, [updateState]);

  return (
    <section className="section-shell pb-16 pt-6 sm:pb-20 sm:pt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Memories for {memorialName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {memories.length === 0 ? (
            <p className="text-muted-foreground">No submitted memories yet.</p>
          ) : (
            <ul className="space-y-4">
              {memories.map((memory) => (
                <li key={memory.id} className="rounded-xl border border-border bg-card/50 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{memory.author_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(memory.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {memory.is_approved ? (
                        <span
                          className="mr-1 rounded-full border border-[#58745c]/30 bg-[#e6efe7] px-2 py-0.5 text-xs font-medium text-[#315236]"
                          title="This memory has been approved for sharing"
                        >
                          Approved
                        </span>
                      ) : null}
                      <form action={approvalFormAction}>
                        <input type="hidden" name="memorialSlug" value={memorialSlug} />
                        <input type="hidden" name="memoryId" value={memory.id} />
                        <input type="hidden" name="isApproved" value={String(!memory.is_approved)} />
                        <Button
                          type="submit"
                          variant="ghost"
                          disabled={approvalPending}
                          className={
                            memory.is_approved
                              ? "h-9 w-9 rounded-full p-0 text-[#315236]"
                              : "h-9 rounded-full px-2 text-[#315236]"
                          }
                          aria-label={memory.is_approved ? "Unapprove memory" : "Approve memory"}
                          title={memory.is_approved ? "Unapprove memory" : "Approve memory"}
                        >
                          {memory.is_approved ? (
                            <SquareCheckBig aria-hidden="true" className="h-5 w-5" />
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Square aria-hidden="true" className="h-5 w-5" />
                              <span className="text-[0.68rem] font-semibold uppercase tracking-wide">
                                Approve
                              </span>
                            </span>
                          )}
                        </Button>
                      </form>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-9 rounded-full p-0"
                        onClick={() => openEditDialog(memory)}
                        aria-label={`Edit memory from ${memory.author_name}`}
                        title="Edit memory"
                      >
                        <Pencil aria-hidden="true" className="h-5 w-5" />
                      </Button>
                      <form
                        action={deleteFormAction}
                        onSubmit={(event) => {
                          const confirmed = window.confirm(
                            `Delete memory from ${memory.author_name}? This cannot be undone.`,
                          );
                          if (!confirmed) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="memorialSlug" value={memorialSlug} />
                        <input type="hidden" name="memoryId" value={memory.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          disabled={deletePending}
                          className="h-9 w-9 rounded-full p-0 text-[#7b2f2f]"
                          aria-label="Delete memory"
                          title="Delete memory"
                        >
                          <Trash2 aria-hidden="true" className="h-5 w-5" />
                        </Button>
                      </form>
                    </div>
                  </div>

                  <p className="mb-3 whitespace-pre-wrap">{memory.message}</p>

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
          )}
        </CardContent>
      </Card>
      <dialog
        ref={editDialogRef}
        className="m-auto w-[min(92vw,42rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/35"
      >
        <form
          key={editingMemory?.id ?? "edit-memory"}
          className="space-y-4 p-6"
          action={updateFormAction}
        >
          <input type="hidden" name="memorialSlug" value={memorialSlug} />
          {editingMemory ? (
            <input type="hidden" name="memoryId" value={editingMemory.id} />
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Edit memory</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the name or memory text.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                editDialogRef.current?.close();
                setEditingMemory(null);
              }}
            >
              Close
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="author_name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="author_name"
              name="author_name"
              type="text"
              maxLength={200}
              autoComplete="name"
              required
              className={fieldInputClassName}
              defaultValue={authorName}
            />
            {activeErrors?.author_name ? (
              <p className={fieldErrorClassName}>{activeErrors.author_name}</p>
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
              required
              maxLength={2000}
              className={`${fieldInputClassName} min-h-[160px]`}
              defaultValue={memoryMessage}
            />
            {activeErrors?.message ? (
              <p className={fieldErrorClassName}>{activeErrors.message}</p>
            ) : null}
          </div>

          {activeErrors?.form ? (
            <p className={fieldErrorClassName}>{activeErrors.form}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                editDialogRef.current?.close();
                setEditingMemory(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePending}>
              {updatePending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
      <Toast
        id={deleteState.notificationId}
        message={deleteState.error || (deleteState.ok && deleteState.deletedId ? "Memory deleted." : null)}
        tone={deleteState.error ? "error" : "success"}
      />
      <Toast
        id={approvalState.notificationId}
        message={
          approvalState.error ||
          (approvalState.ok && approvalState.memoryId
            ? approvalState.isApproved
              ? "Memory approved."
              : "Memory unapproved."
            : null)
        }
        tone={approvalState.error ? "error" : "success"}
      />
      <Toast
        id={updateState.notificationId}
        message={updateState.message || updateState.errors?.form || null}
        tone={updateState.errors?.form ? "error" : "success"}
      />
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
        <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-16 sm:px-8">
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
