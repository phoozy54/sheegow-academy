"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { LessonNote } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StickyNote,
  Loader2,
  CheckCircle2,
  Trash2,
  LockKeyhole,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/ui";
import { useT } from "@/lib/i18n";

interface NotesPanelProps {
  lessonId: string;
  /** When true, the panel renders as a self-contained card (player tab). */
  variant?: "card" | "inline";
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Personal note widget used inside the course player. One note per
 * (student, lesson) — the unique constraint lives in the Prisma schema.
 *
 * Auto-saves with a 2-second debounce after the student stops typing. The
 * "Saved" indicator clears 2s after each successful save so the user gets
 * real feedback without the badge becoming visual noise.
 */
export function NotesPanel({
  lessonId,
  variant = "card",
}: NotesPanelProps) {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const [note, setNote] = useState<LessonNote | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef("");
  const saveInFlightRef = useRef(false);

  // Keep a ref of the current draft so the debounce callback always sees the
  // latest text without restarting on every keystroke.
  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.lessonNote(lessonId);
      setNote(res.note);
      setDraft(res.note?.content ?? "");
    } catch (e) {
      // 403 means the user doesn't have access — surface that as a soft error.
      if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
        setNote(null);
      } else {
        toast.error(
          e instanceof ApiError ? e.message : "Could not load your notes"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [user, authLoading, load]);

  const performSave = useCallback(
    async (content: string) => {
      // Skip when nothing meaningful changed.
      if (note && content === note.content) return;
      saveInFlightRef.current = true;
      setSaveState("saving");
      try {
        const res = await api.saveLessonNote(lessonId, { content });
        setNote(res.note);
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
      } catch (e) {
        setSaveState("error");
        toast.error(
          e instanceof ApiError ? e.message : "Could not save your note"
        );
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [lessonId, note]
  );

  // Debounced auto-save: 2s after the last keystroke, fire performSave with
  // the latest draft. If a save is already in flight, schedule another run.
  useEffect(() => {
    if (!user) return;
    if (!draft) return;
    // Don't trigger a save while loading initial note state.
    if (loading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void performSave(latestDraftRef.current);
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, user, loading, performSave]);

  // Flush any pending save when the user navigates away or unmounts.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      // Final flush — only if there's an actual diff and no save in flight.
      if (
        user &&
        !saveInFlightRef.current &&
        latestDraftRef.current &&
        (!note || latestDraftRef.current !== note.content)
      ) {
        // Fire and forget — the server is the source of truth.
        void api.saveLessonNote(lessonId, { content: latestDraftRef.current });
      }
    };
  }, [lessonId, user, note]);

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm("Delete your note for this lesson? This cannot be undone.")) return;
    try {
      await api.deleteLessonNote(lessonId, note.id);
      setNote(null);
      setDraft("");
      setSaveState("idle");
      toast.success("Note deleted.");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not delete your note"
      );
    }
  };

  // Auth gate.
  if (authLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center",
          variant === "card" && "p-8"
        )}
      >
        <LockKeyhole className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {t("notes.signInToTake")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("notes.notesAutoSaved")}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 gap-1.5"
          onClick={() => openAuthModal("login")}
        >
          <LogIn className="h-3.5 w-3.5" /> {t("auth.logIn")}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === "card" &&
          "rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <StickyNote className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("notes.myNotes")}</h3>
            <p className="text-[11px] text-muted-foreground">
              {t("notes.autoSaved")}
            </p>
          </div>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {loading ? (
        <Skeleton className="h-44 w-full rounded-lg" />
      ) : (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Take notes here as you watch the lesson — markdown shortcuts work. Tips: use # for headings, - for bullets, > for quotes."
          rows={10}
          maxLength={50_000}
          className="bg-background font-mono text-sm leading-relaxed"
          aria-label="Lesson notes"
        />
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{draft.length.toLocaleString()} / 50,000 characters</span>
        {note && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-red-600"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("notes.deleteNote")}
          </Button>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const t = useT();
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-600">
        <Loader2 className="h-3 w-3 animate-spin" /> {t("notes.saving")}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> {t("notes.saved")}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600">
        Not saved
      </span>
    );
  }
  return null;
}
