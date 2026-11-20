"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { coursePath } from "@/lib/slug";
import type { Course, Enrollment } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, Users, Play } from "lucide-react";
import { formatPrice, levelBadgeClass } from "@/lib/ui";
import { trackConversion } from "@/lib/analytics";

export function CourseCard({
  course,
  enrollment,
  all,
}: {
  course: Course;
  enrollment?: Enrollment | null;
  all: Pick<Course, "id" | "title">[];
}) {
  const { user, openAuthModal } = useStore();
  const router = useRouter();
  const href = coursePath(course, all);

  const isManager =
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  // Only admins / super admins can see course prices. Teachers and students
  // see "Price at checkout" instead.
  const canSeePrice =
    user?.role === "admin" || user?.role === "super_admin";
  const canContinue = !isManager && !!enrollment;

  const handleEnroll = () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    trackConversion("checkout_start", { courseId: course.id });
    router.push(`/checkout/${course.id}`);
  };

  return (
    <Card className="card-lift group flex h-full flex-col overflow-hidden p-0">
      {/* Image */}
      <Link
        href={href}
        className="relative block aspect-[16/9] w-full overflow-hidden"
      >
        {course.image ? (
          <img loading="lazy" decoding="async"
            src={course.image}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
            <Play className="h-10 w-10 text-indigo-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
          <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
          LIVE
        </span>
        <Badge
          variant="outline"
          className={`absolute right-3 top-3 border ${levelBadgeClass(course.level)}`}
        >
          {course.level}
        </Badge>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{course.duration} weeks</span>
          {course.teacher && (
            <>
              <span className="text-border">•</span>
              <Users className="h-3.5 w-3.5" />
              <span>Live</span>
            </>
          )}
        </div>

        <Link
          href={href}
          className="mb-2 line-clamp-2 text-left text-base font-bold leading-snug transition-colors hover:text-indigo-600"
        >
          {course.title}
        </Link>

        <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {course.description}
        </p>

        {/* Teacher + rating */}
        <div className="mb-3 flex items-center justify-between gap-2">
          {course.teacher ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={course.teacher.profilePicture || undefined} />
                <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  {course.teacher.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {course.teacher.fullName}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Expert teacher</span>
          )}
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{course.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({course.reviewCount})
            </span>
          </div>
        </div>

        {canContinue && (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Your progress</span>
              <span>{enrollment!.progress}%</span>
            </div>
            <Progress value={enrollment!.progress} className="h-1.5" />
          </div>
        )}
        {isManager && (
          <p className="mb-3 text-xs font-medium text-indigo-600">
            Admin/teacher access — no enrollment required
          </p>
        )}

        {/* Price is hidden from public — only admins see it for management.
            Students learn the price at checkout. */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          {canSeePrice ? (
            <span className="text-sm font-bold text-foreground">
              {typeof course.price === "number" && Number.isFinite(course.price) ? (
                <>
                  {formatPrice(course.price)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    USD
                  </span>
                </>
              ) : (
                <span className="text-xs font-normal text-muted-foreground">
                  No price set
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              Price at checkout
            </span>
          )}
          <Button
            size="sm"
            onClick={
              isManager
                ? () => router.push(`/learn/${course.id}`)
                : canContinue
                  ? () => router.push(`/learn/${course.id}`)
                  : handleEnroll
            }
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isManager ? "Open course" : canContinue ? "Continue" : "Enroll"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
