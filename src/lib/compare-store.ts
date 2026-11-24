"use client";

/**
 * Course comparison state.
 *
 * Holds the list of course ids the visitor has queued for side-by-side
 * comparison. State is persisted to localStorage so a student can browse the
 * catalog across pages without losing their selection. Capped at 3 ids — the
 * comparison table only renders 3 columns.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_COMPARE = 3;

interface CompareState {
  /** Course ids queued for comparison (oldest first, newest at the end). */
  ids: string[];
  /** Add a course id. Returns false when the tray is full so the caller can
   *  surface a "max 3" toast. Idempotent — adding an existing id is a no-op. */
  add: (id: string) => boolean;
  /** Remove a course id. No-op when the id is not in the tray. */
  remove: (id: string) => void;
  /** Toggle a course id; returns the new "selected" state. */
  toggle: (id: string) => boolean;
  /** Clear every queued course id. */
  clear: () => void;
  /** True when the course id is currently in the tray. */
  has: (id: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],

      add: (id) => {
        const trimmed = id.trim();
        if (!trimmed) return false;
        const current = get().ids;
        if (current.includes(trimmed)) return true;
        if (current.length >= MAX_COMPARE) return false;
        set({ ids: [...current, trimmed] });
        return true;
      },

      remove: (id) => {
        const trimmed = id.trim();
        set((s) => ({ ids: s.ids.filter((x) => x !== trimmed) }));
      },

      toggle: (id) => {
        const trimmed = id.trim();
        if (!trimmed) return false;
        const current = get().ids;
        if (current.includes(trimmed)) {
          set({ ids: current.filter((x) => x !== trimmed) });
          return false;
        }
        if (current.length >= MAX_COMPARE) return false;
        set({ ids: [...current, trimmed] });
        return true;
      },

      clear: () => set({ ids: [] }),

      has: (id) => get().ids.includes(id.trim()),
    }),
    {
      name: "sheegow-compare",
      // localStorage is the right store: the tray survives navigation but
      // never leaves the device.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }),
    }
  )
);

export const COMPARE_MAX = MAX_COMPARE;
