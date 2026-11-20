"use client";

import { useStore } from "@/lib/store";
import type { Course } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, Users, Play } from "lucide-react";
import { levelBadgeClass, formatPrice } from "@/lib/ui";

export function CourseCard({ course }: { course: Course }) {
  const { openCourse, openCheckout, user, openAuthModal } = useStore();

  const handleEnroll = () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    openCheckout(course.id);
  };

  return (
    <Card className="card-lift group flex h-full flex-col overflow-hidden p-0">
      {/* Image */}
      <button
        onClick={() => openCourse(course.id)}
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
      </button>

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

        <button
          onClick={() => openCourse(course.id)}
          className="mb-2 line-clamp-2 text-left text-base font-bold leading-snug transition-colors hover:text-indigo-600"
        >
          {course.title}
        </button>

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

        {/* Price + enroll */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div>
            <span className="text-lg font-extrabold text-foreground">
              {course.price === 0 ? "Free" : formatPrice(course.price)}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              /{course.duration}w
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleEnroll}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Enroll
          </Button>
        </div>
      </div>
    </Card>
  );
}
