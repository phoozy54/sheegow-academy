import type { Metadata } from "next";
import { Suspense } from "react";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { SearchView } from "@/components/sheegow/views/search-view";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Search | SHEEGOW ACADEMY",
  description:
    "Search live English courses, classes and people on SHEEGOW ACADEMY.",
  path: "/search",
});

export default function SearchPage() {
  return (
    <SeoShell>
      {/* useSearchParams() requires a Suspense boundary. */}
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-5xl px-4 py-12 text-sm text-muted-foreground">
            Loading search…
          </div>
        }
      >
        <SearchView />
      </Suspense>
    </SeoShell>
  );
}
