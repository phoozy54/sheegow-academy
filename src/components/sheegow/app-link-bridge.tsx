"use client";

import { useEffect } from "react";
import { useStore, type View } from "@/lib/store";

const ROUTABLE_VIEWS = new Set<View>([
  "home",
  "courses",
  "course-detail",
  "live",
  "about",
  "contact",
  "my-courses",
  "profile",
  "dashboard",
]);

/**
 * Lets server-rendered SEO pages link into the interactive app with a normal
 * <a href>. Those links land on `/?view=...`; this bridge restores the right
 * in-app view, then cleans the URL so the canonical homepage stays `/`.
 */
export function AppLinkBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return;

    const store = useStore.getState();
    const rawView = params.get("view") as View | null;
    const courseId = params.get("course") ?? params.get("courseId");
    const dashboardSection = params.get("dashboard");

    if (courseId && (rawView === "course-detail" || !rawView)) {
      store.openCourse(courseId);
    } else if (dashboardSection) {
      store.openDashboard(dashboardSection);
    } else if (rawView && ROUTABLE_VIEWS.has(rawView)) {
      store.navigate(rawView);
    } else {
      return;
    }

    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return null;
}
