"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { BundleWithCourses } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Boxes,
  Check,
  ChevronRight,
  Loader2,
  Package,
  Sparkles,
  Tag,
} from "lucide-react";
import { formatPrice, levelBadgeClass } from "@/lib/ui";
import { trackConversion } from "@/lib/analytics";
import { useT } from "@/lib/i18n";

/** Bundles section for the /courses page. Shown below the individual courses
 *  grid. Renders one card per active bundle with the original total price
 *  vs. the bundle price, the savings, and a "Get Bundle" button. */
export function BundlesSection() {
  const t = useT();
  const router = useRouter();
  const { user, openAuthModal } = useStore();
  const [bundles, setBundles] = useState<BundleWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .bundles()
      .then((r) => {
        if (active) setBundles(r.bundles ?? []);
      })
      .catch((e) => {
        if (!active) return;
        const msg =
          e instanceof ApiError ? e.message : "Could not load bundles";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <BundlesHeader />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    // A failed bundles fetch should not break the courses page — show a small
    // inline note and let the rest of the page keep working.
    return (
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <BundlesHeader />
        <p className="text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (bundles.length === 0) return null;

  const handleGetBundle = (bundle: BundleWithCourses) => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    trackConversion("bundle_checkout_start", { bundleId: bundle.id });
    router.push(`/checkout/bundle/${bundle.id}`);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <BundlesHeader />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => {
          const courseCount = bundle.courses.length;
          const savingsPercent =
            bundle.originalTotal > 0
              ? Math.round((bundle.savings / bundle.originalTotal) * 100)
              : 0;
          const hasDiscount = bundle.savings > 0;

          return (
            <Card
              key={bundle.id}
              className="card-lift group relative flex h-full flex-col overflow-hidden p-0"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                {bundle.image ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={bundle.image}
                    alt={bundle.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-200">
                    <Package className="h-10 w-10 text-emerald-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
                  <Sparkles className="h-3 w-3" />
                  Bundle
                </span>
                {hasDiscount && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                    <Tag className="h-3 w-3" />
                    {t("bundles.save")} {savingsPercent}%
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="absolute bottom-3 left-3 border bg-white/90 text-foreground"
                >
                  <Boxes className="mr-1 h-3 w-3" />
                  {courseCount} {courseCount === 1 ? t("bundleCheckout.courseSingular") : t("bundleCheckout.coursePlural")}
                </Badge>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-2 text-base font-bold leading-snug text-foreground">
                  {bundle.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {bundle.description}
                </p>

                {/* Included course titles */}
                <ul className="mb-4 space-y-1.5 overflow-y-auto pr-1 max-h-32 text-sm">
                  {bundle.courses.slice(0, 4).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start gap-2 text-foreground"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span className="line-clamp-1">{c.title}</span>
                    </li>
                  ))}
                  {courseCount > 4 && (
                    <li className="pl-6 text-xs font-medium text-emerald-600">
                      +{courseCount - 4} {t("bundles.more")}
                    </li>
                  )}
                </ul>

                {/* Pricing */}
                <div className="mt-auto space-y-3 border-t pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-emerald-700">
                        {formatPrice(bundle.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(bundle.originalTotal)}
                        </span>
                      )}
                    </div>
                    {hasDiscount && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {t("bundles.save")} {formatPrice(bundle.savings)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleGetBundle(bundle)}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700"
                  >
                    Get Bundle
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function BundlesHeader() {
  const t = useT();
  return (
    <div className="mb-6">
      <Badge
        variant="outline"
        className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
      >
        <Package className="h-3 w-3" />
        {t("bundles.eyebrow")}
      </Badge>
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {t("bundles.title1")} <span className="gradient-text">{t("bundles.titleHighlight")}</span>
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
        {t("bundles.desc")}
      </p>
    </div>
  );
}

/** Minimal spinner used while bundles are loading on the courses page. */
export function BundlesLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
    </div>
  );
}

/** Re-export the level badge helper so consumers can render course levels
 *  consistently inside a bundle card. */
export { levelBadgeClass };
