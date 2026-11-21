import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, UserRound } from "lucide-react";
import {
  BulkList,
  FaqSection,
  SeoContact,
  SeoSection,
  SeoShell,
} from "@/components/sheegow/seo/seo-shell";
import {
  courseJsonLd,
  coursePath,
  courseSeo,
  faqJsonLd,
  getPublicCourses,
  NAP,
  organizationJsonLd,
  pageMeta,
  readable,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function findCourse(slug: string) {
  const all = await getPublicCourses();
  const course = all.find((item) => coursePath(item, all) === `/courses/${slug}`);
  return course ? { course, all } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findCourse(slug);
  if (!found) {
    return pageMeta({
      title: "Course not found",
      description: "This English course is not available.",
      path: `/courses/${slug}`,
    });
  }
  const copy = courseSeo(found.course);
  return pageMeta({
    ...copy,
    path: coursePath(found.course, found.all),
  });
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const found = await findCourse(slug);
  if (!found) notFound();

  const { course, all } = found;
  const copy = courseSeo(course);
  const path = coursePath(course, all);
  const teacherName = readable(course.teacher?.fullName) || "Ciise Mohamed Sheeq (SHEEGOW)";
  const outcomes = (course.whatYouLearn || "")
    .split(/\r?\n/)
    .map((line) => readable(line).replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  const faqs = [
    {
      question: `Is ${readable(course.title)} a recorded course?`,
      answer:
        "No. Every SHEEGOW ACADEMY course is made of live, interactive video classes. You join in real time, speak with your teacher and classmates, ask questions, and use chat and raise-hand. Recordings/replays are not provided.",
    },
    {
      question: "Who teaches this course?",
      answer: `${teacherName} teaches the live sessions. Ciise is an English expert with a university degree and 15 years of teaching experience, and is the academy's real, sole teacher.`,
    },
    {
      question: "Can I join from anywhere in the world?",
      answer:
        "Yes. Classes are online and live, so you can join from any country with a stable internet connection.",
    },
    {
      question: "How do I enrol and pay?",
      answer:
        "Create a free student account, enrol in the course, and complete payment securely at checkout, where the full amount is shown. A free trial is possible only when an administrator approves it in advance.",
    },
  ];

  return (
    <SeoShell
      jsonLd={[
        organizationJsonLd(),
        courseJsonLd(course, path),
        faqJsonLd(faqs),
      ]}
    >
      <section className="border-b bg-gradient-to-b from-indigo-50/70 to-background">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            {readable(course.level)} · Live online course
          </p>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            {readable(course.title)}
          </h1>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {copy.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-indigo-500" /> {course.duration} weeks
            </span>
            <span className="flex items-center gap-1.5">
              <UserRound className="h-4 w-4 text-indigo-500" /> {teacherName}
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/?view=course-detail&course=${encodeURIComponent(course.id)}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-700"
            >
              Enrol in the app
            </Link>
            <a
              href={NAP.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-300 bg-background px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Ask a question on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <SeoSection title="What you will learn">
        {outcomes.length > 0 ? (
          <BulkList items={outcomes} />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {readable(course.description)} You will practise speaking, listening
            and real-life English in every live lesson.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/courses" className="font-semibold text-indigo-600 hover:underline">
            ← All live English courses
          </Link>
        </p>
      </SeoSection>

      <FaqSection items={faqs} />
      <SeoContact />
    </SeoShell>
  );
}
