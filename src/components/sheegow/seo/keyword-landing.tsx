import Link from "next/link";
import { CourseSeoGrid } from "@/components/sheegow/seo/course-seo-grid";
import {
  BulkList,
  FaqSection,
  SeoContact,
  SeoHero,
  SeoSection,
  SeoShell,
} from "@/components/sheegow/seo/seo-shell";
import { faqJsonLd, organizationJsonLd, type SeoCourse } from "@/lib/seo";
import type { LandingConfig } from "@/lib/landing-copy";

export function KeywordLanding({
  config,
  courses,
}: {
  config: LandingConfig;
  courses: SeoCourse[];
}) {
  const featured = courses.filter((course) => config.levels.includes(course.level));
  const shown = (featured.length > 0 ? featured : courses).slice(0, 6);

  return (
    <SeoShell jsonLd={[organizationJsonLd(), faqJsonLd(config.faqs)]}>
      <SeoHero
        eyebrow={config.eyebrow}
        title={config.title}
        lead={config.lead}
      />

      {config.sections.map((section) => (
        <SeoSection key={section.heading} title={section.heading}>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {section.body}
          </p>
          <BulkList items={section.bullets} />
        </SeoSection>
      ))}

      <SeoSection title="Live courses you can join">
        {shown.length > 0 ? (
          <CourseSeoGrid courses={shown} all={courses} />
        ) : (
          <p className="text-sm text-muted-foreground">
            New live courses are being prepared. Contact us for the current
            schedule.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          <Link
            href="/courses"
            className="font-semibold text-emerald-600 hover:underline"
          >
            See every live English course →
          </Link>
        </p>
      </SeoSection>

      <FaqSection items={config.faqs} />
      <SeoContact />
    </SeoShell>
  );
}
