import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  SeoShell,
} from "@/components/sheegow/seo/seo-shell";
import { CourseDetailView } from "@/components/sheegow/views/course-detail-view";
import {
  coursePath,
  courseSeo,
  faqJsonLd,
  getPublicCourses,
  organizationJsonLd,
  pageMeta,
  readable,
  courseJsonLd,
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
      <CourseDetailView courseId={course.id} />
    </SeoShell>
  );
}
