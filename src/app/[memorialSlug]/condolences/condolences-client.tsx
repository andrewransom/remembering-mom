"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  CondolenceFormState,
  CondolenceDeleteState,
  createCondolenceAction,
  deleteCondolenceAction,
  updateCondolenceAction,
} from "./actions";
import { CondolenceSortMode } from "@/lib/supabase/condolences";

const fieldInputClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";
const fieldErrorClassName = "text-sm text-[#7b2f2f]";

const formatDisplayDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(isoDate));

const iconButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/70 text-foreground/75 transition hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

type CondolenceItem = {
  id: string;
  memorial_id: string;
  from_name: string;
  source: string | null;
  date_received: string | null;
  message: string;
  created_at: string;
};

type CondolencesClientProps = {
  memorialSlug: string;
  memorialName: string;
  condolences: CondolenceItem[];
  initialSort: CondolenceSortMode;
};

const initialCreateState: CondolenceFormState = {
  ok: true,
  values: {
    from_name: "",
    source: "",
    date_received: "",
    message: "",
  },
  errors: {},
};

const initialDeleteState: CondolenceDeleteState = {
  ok: false,
};

export function CondolencesClient({ memorialSlug, memorialName, condolences, initialSort }: CondolencesClientProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editingCondolence, setEditingCondolence] = useState<CondolenceItem | null>(null);
  const [createState, createFormAction, createPending] = useActionState(createCondolenceAction, initialCreateState);
  const [updateState, updateFormAction, updatePending] = useActionState(updateCondolenceAction, initialCreateState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteCondolenceAction,
    initialDeleteState,
  );

  const isEditing = Boolean(editingCondolence);
  const activePending = isEditing ? updatePending : createPending;
  const formAction = isEditing ? updateFormAction : createFormAction;
  const activeValues =
    isEditing && updateState.values?.condolence_id === editingCondolence?.id
      ? updateState.values
      : !isEditing
        ? createState.values
        : undefined;
  const activeErrors =
    isEditing && updateState.values?.condolence_id === editingCondolence?.id
      ? updateState.errors
      : !isEditing
        ? createState.errors
        : undefined;
  const fromName = activeValues?.from_name ?? editingCondolence?.from_name ?? "";
  const source = activeValues?.source ?? editingCondolence?.source ?? "";
  const dateReceived = activeValues?.date_received ?? editingCondolence?.date_received ?? "";
  const message = activeValues?.message ?? editingCondolence?.message ?? "";

  const openAddDialog = () => {
    setEditingCondolence(null);
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  };

  const openEditDialog = (condolence: CondolenceItem) => {
    setEditingCondolence(condolence);
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  };

  useEffect(() => {
    if (!createState.ok && createState.errors) {
      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }
    }

    if (createState.ok && createState.message) {
      dialogRef.current?.close();
    }
  }, [createState]);

  useEffect(() => {
    if (!updateState.ok && updateState.errors) {
      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }
    }

    if (updateState.ok && updateState.message) {
      dialogRef.current?.close();
    }
  }, [updateState]);

  return (
    <section className="w-full py-4 sm:py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Condolences for {memorialName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="condolence-sort" className="sr-only">
                  Sort condolences
                </label>
                <select
                  id="condolence-sort"
                  value={initialSort}
                  onChange={(event) => {
                    router.push(`/${memorialSlug}/condolences?sort=${event.target.value}`);
                  }}
                  className="h-10 rounded-xl border border-border bg-card/80 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/70"
                >
                  <option value="date">Sort by date received</option>
                  <option value="name">Sort by sender name</option>
                </select>
              </div>
              <Button type="button" onClick={openAddDialog}>
                Add
              </Button>
            </div>

            <dialog
              ref={dialogRef}
              className="m-auto w-[min(92vw,42rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/35"
            >
              <form
                key={editingCondolence?.id ?? "new-condolence"}
                className="space-y-4 p-6"
                action={formAction}
              >
                <input type="hidden" name="memorialSlug" value={memorialSlug} />
                {editingCondolence ? (
                  <input type="hidden" name="condolenceId" value={editingCondolence.id} />
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {editingCondolence ? "Edit condolence" : "Add condolence"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Record cards, messages, or condolences received in person.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                    Close
                  </Button>
                </div>

                <div className="space-y-2">
                  <label htmlFor="from_name" className="text-sm font-medium">
                    From
                  </label>
                  <input
                    id="from_name"
                    name="from_name"
                    type="text"
                    maxLength={200}
                    autoComplete="name"
                    required
                    className={fieldInputClassName}
                    placeholder="Sender name"
                    defaultValue={fromName}
                  />
                  {activeErrors?.from_name ? (
                    <p className={fieldErrorClassName}>{activeErrors.from_name}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="source" className="text-sm font-medium">
                      Source
                    </label>
                    <input
                      id="source"
                      name="source"
                      type="text"
                      maxLength={200}
                      className={fieldInputClassName}
                      placeholder="Card from Bob"
                      defaultValue={source}
                    />
                    {activeErrors?.source ? (
                      <p className={fieldErrorClassName}>{activeErrors.source}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="date_received" className="text-sm font-medium">
                      Date received
                    </label>
                    <input
                      id="date_received"
                      name="date_received"
                      type="date"
                      className={fieldInputClassName}
                      defaultValue={dateReceived}
                    />
                    {activeErrors?.date_received ? (
                      <p className={fieldErrorClassName}>{activeErrors.date_received}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    maxLength={5000}
                    className={`${fieldInputClassName} min-h-[160px]`}
                    placeholder="Received message content"
                    defaultValue={message}
                  />
                  {activeErrors?.message ? (
                    <p className={fieldErrorClassName}>{activeErrors.message}</p>
                  ) : null}
                </div>

                {activeErrors?.form ? (
                  <p className={fieldErrorClassName}>{activeErrors.form}</p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={activePending}>
                    {activePending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </dialog>

            {condolences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No condolences have been recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border border-border text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Date received</th>
                      <th className="px-3 py-2">Message</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condolences.map((condolence) => {
                      const receivedDate = condolence.date_received
                        ? formatDisplayDate(condolence.date_received)
                        : "Not recorded";

                      return (
                        <tr key={condolence.id} className="border-b border-border align-top last:border-b-0">
                          <td className="px-3 py-4 font-medium">{condolence.from_name}</td>
                          <td className="px-3 py-4">{condolence.source || "Not recorded"}</td>
                          <td className="px-3 py-4">{receivedDate}</td>
                          <td className="whitespace-pre-wrap px-3 py-4">{condolence.message}</td>
                          <td className="px-3 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={iconButtonClassName}
                                aria-label={`Edit condolence from ${condolence.from_name}`}
                                title="Edit"
                                onClick={() => openEditDialog(condolence)}
                              >
                                <Pencil aria-hidden="true" size={16} />
                              </button>
                            <form
                              action={deleteFormAction}
                              onSubmit={(event) => {
                                const confirmed = window.confirm(
                                  `Delete condolence from ${condolence.from_name}? This cannot be undone.`,
                                );
                                if (!confirmed) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="memorialSlug" value={memorialSlug} />
                              <input type="hidden" name="condolenceId" value={condolence.id} />
                              <button
                                type="submit"
                                className={`${iconButtonClassName} text-[#7b2f2f] hover:text-[#6b2727]`}
                                disabled={deletePending}
                                aria-label={`Delete condolence from ${condolence.from_name}`}
                                title="Delete"
                              >
                                <Trash2 aria-hidden="true" size={16} />
                              </button>
                            </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </CardContent>
      </Card>
      <Toast id={createState.notificationId} message={createState.message} tone="success" />
      <Toast id={updateState.notificationId} message={updateState.message} tone="success" />
      <Toast
        id={deleteState.notificationId}
        message={deleteState.error || (deleteState.ok ? "Condolence deleted." : null)}
        tone={deleteState.error ? "error" : "success"}
      />
    </section>
  );
}
