"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
 * Keeps in-app views addressable. Public SEO pages are real routes; interactive
 * views live on `/?view=...` so they can be shared, bookmarked and navigated
 * with the browser back button. The URL is intentionally left intact.
 */
export function AppLinkBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/") return;

    const store = useStore.getState();
    const rawView = searchParams.get("view") as View | null;
    const courseId = searchParams.get("course") ?? searchParams.get("courseId");
    const dashboardSection = searchParams.get("dashboard");

    if (courseId && (rawView === "course-detail" || !rawView)) {
      store.openCourse(courseId);
    } else if (dashboardSection) {
      store.openDashboard(dashboardSection);
    } else if (rawView && ROUTABLE_VIEWS.has(rawView)) {
      store.navigate(rawView);
    } else if (store.view !== "home") {
      // Arrived from a public route without a view parameter: start at home.
      store.navigate("home");
    }
  }, [pathname, searchParams]);

  return null;
}
