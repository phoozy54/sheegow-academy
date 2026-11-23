"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Enrollment } from "@/lib/types";

const ACTIVE_STATUSES = new Set(["active", "completed"]);

/**
 * Shared view of the current student's enrollments.
 *
 * Managers never get the student enroll/continue UI, so the request is only
 * made for students. Expired/trial-inactive rows are filtered out here; the
 * server-side content-access helper remains the source of truth for access.
 */
export function useMyEnrollments() {
  const user = useStore((s) => s.user);
  const isStudent = user?.role === "student";
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!isStudent) {
        if (active) {
          setEnrollments([]);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);
      try {
        const r = await api.myCourses();
        if (!active) return;
        setEnrollments(
          r.enrollments.filter(
            (e) =>
              ACTIVE_STATUSES.has(e.status) &&
              (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now())
          )
        );
      } catch {
        if (active) setEnrollments([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isStudent, user?.id]);

  const byCourse = useMemo(() => {
    const map = new Map<string, Enrollment>();
    for (const enrollment of enrollments) {
      if (enrollment.courseId) map.set(enrollment.courseId, enrollment);
    }
    return map;
  }, [enrollments]);

  return { enrollments, byCourse, loading };
}
