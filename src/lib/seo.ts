import { cache } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export { slugify, courseSlug, coursePath } from "@/lib/slug";

/** The single canonical origin for every public page. */
export const SITE_URL = "https://www.sheegowacademy.com";
export const SITE_NAME = "SHEEGOW ACADEMY";

/** Public NAP — keep identical on the site, Google Business and social profiles. */
export const NAP = {
  name: SITE_NAME,
  email: "info@sheegowacademy.com",
  phone: "+252 63 4085151",
  phoneHref: "tel:+252634085151",
  whatsapp: "https://wa.me/252634085151",
  address: "Hargeisa, Somaliland",
} as const;

export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "SHEEGOW ACADEMY — Live English classes for learners everywhere",
} as const;

export type SeoCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  duration: number;
  image: string | null;
  whatYouLearn: string | null;
  updatedAt: Date;
  teacher: { fullName: string | null; bio: string | null } | null;
};

/** Public, active courses only — reused by pages, metadata and sitemap. */
export const getPublicCourses = cache(async (): Promise<SeoCourse[]> => {
  return db.course.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      level: true,
      price: true,
      duration: true,
      image: true,
      whatYouLearn: true,
      updatedAt: true,
      teacher: { select: { fullName: true, bio: true } },
    },
    orderBy: [{ level: "asc" }, { title: "asc" }],
  });
});

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Shared per-page metadata: unique title/description + matching www canonical. */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const safeTitle = seoTitle(title);
  const safeDescription = seoDescription(description);
  return {
    // `absolute` prevents the root title template from appending the site name twice.
    title: { absolute: safeTitle },
    description: safeDescription,
    alternates: { canonical: path },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: [OG_IMAGE.url],
    },
  };
}

/** Keep titles <= 60 and descriptions <= 155 characters. */
export function seoTitle(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= 60 ? clean : `${clean.slice(0, 57).trimEnd()}…`;
}

export function seoDescription(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= 155 ? clean : `${clean.slice(0, 152).trimEnd()}…`;
}

/** Clean up imported em-dash mojibake for readable HTML/meta output. */
export function readable(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/\uFFFD/g, "—")
    .replace(/\?\?/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

type CourseSeoCopy = { title: string; description: string };

/** Hand-written, unique copy for the six real courses. */
const COURSE_COPY: Record<string, CourseSeoCopy> = {
  cmwmpccht0006vs0nvvbbbfu4: {
    title: "English for Beginners — Live Online Course",
    description:
      "Start speaking English from day one in live online classes for learners everywhere. Learn greetings, travel and daily conversation with teacher Ciise.",
  },
  cmwmpcctz0008vs0niuafulzh: {
    title: "Intermediate English — Live Speaking Classes",
    description:
      "Build fluent conversation and stronger grammar in live interactive classes. Practice speaking every session with teacher Ciise and learners worldwide.",
  },
  cmwmpcdif000gvs0nvyvknqdy: {
    title: "Advanced English & Academic Writing — Live",
    description:
      "Master academic writing, critical thinking and confident expression in live online classes for advanced learners and university students.",
  },
  cmwmpcd67000cvs0noo5w1x1b: {
    title: "Business English Professional — Live Course",
    description:
      "Speak confidently at work: meetings, presentations, emails and negotiations. Live English classes for professionals, taught by Ciise.",
  },
  cmwmpcdcb000evs0n3ggmo80h: {
    title: "English for Kids (7–12) — Live Online Classes",
    description:
      "Fun live English classes for children aged 7–12. Games, songs and stories with a friendly teacher in small online groups.",
  },
  cmwmpcd03000avs0nrtlewh5d: {
    title: "IELTS Preparation Band 7+ — Live Online",
    description:
      "Prepare for IELTS with live coaching in Listening, Reading, Writing and Speaking, mock tests and personal feedback from Ciise.",
  },
};

export function courseSeo(course: SeoCourse): CourseSeoCopy {
  const curated = COURSE_COPY[course.id];
  if (curated) return curated;
  const cleanTitle = readable(course.title);
  const cleanDescription = readable(course.description);
  return {
    title: seoTitle(`${cleanTitle} — Live English Course`),
    description: seoDescription(
      `${cleanDescription} Live interactive English classes online.`,
    ),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: NAP.name,
    url: SITE_URL,
    email: NAP.email,
    telephone: NAP.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hargeisa",
      addressRegion: "Hargeisa",
      addressCountry: "SO",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: NAP.phoneHref.replace(/^tel:/, ""),
        contactType: "customer support",
        email: NAP.email,
        areaServed: ["SO", "GB", "US"],
        availableLanguage: ["en", "so"],
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function courseJsonLd(course: SeoCourse, path: string) {
  const copy = courseSeo(course);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${absoluteUrl(path)}#course`,
    name: readable(course.title),
    description: copy.description,
    url: absoluteUrl(path),
    inLanguage: "en",
    provider: { "@id": `${SITE_URL}/#organization` },
    instructor: {
      "@type": "Person",
      name: readable(course.teacher?.fullName) || "Ciise Mohamed Sheeq (SHEEGOW)",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `${course.duration} weeks`,
      instructor: {
        "@type": "Person",
        name: readable(course.teacher?.fullName) || "Ciise Mohamed Sheeq (SHEEGOW)",
      },
    },
    offers: {
      "@type": "Offer",
      category: "Education",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(path),
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
