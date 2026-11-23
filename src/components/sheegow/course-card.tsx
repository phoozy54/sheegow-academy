"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { coursePath } from "@/lib/slug";
import type { Course, Enrollment } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, Users, Play, Heart, Loader2 } from "lucide-react";
import { formatPrice, levelBadgeClass } from "@/lib/ui";
import { trackConversion } from "@/lib/analytics";

export function CourseCard({
  course,
  enrollment,
  all,
  /** Pre-seeded wishlist state (e.g. when rendering the wishlist page). */
  wishlisted: initialWishlisted,
  /** Optional callback fired after a successful toggle. Lets the parent
   *  react to wishlist changes — e.g. the wishlist page removes the card
   *  when the user just un-favorited it. */
  onWishlistToggle,
}: {
  course: Course;
  enrollment?: Enrollment | null;
  all: Pick<Course, "id" | "title">[];
  wishlisted?: boolean;
  onWishlistToggle?: (courseId: string, wishlisted: boolean) => void;
}) {
  const { user, openAuthModal } = useStore();
  const router = useRouter();
  const href = coursePath(course, all);

  const [wishlisted, setWishlisted] = useState<boolean>(!!initialWishlisted);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistToggling, setWishlistToggling] = useState(false);

  // Sync when the parent pre-seeds state (e.g. moving from the wishlist page
  // back to the catalog where the parent already knows the answer).
  useEffect(() => {
    if (initialWishlisted !== undefined) {
      setWishlisted(initialWishlisted);
    }
  }, [initialWishlisted]);

  // Only fetch the live wishlist flag when the parent did not provide one.
  // This avoids an N+1 on the wishlist page (where every card is wishlisted)
  // and on views that pre-compute the flag.
  useEffect(() => {
    if (!user) return;
    if (initialWishlisted !== undefined) return;
    let active = true;
    setWishlistLoading(true);
    api
      .isWishlisted(course.id)
      .then((r) => {
        if (active) setWishlisted(r.wishlisted);
      })
      .catch(() => {
        /* best-effort: card just renders as "not wishlisted" */
      })
      .finally(() => {
        if (active) setWishlistLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, course.id, initialWishlisted]);

  const isManager =
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  // Only admins / super admins can see course prices. Teachers and students
  // see "Price at checkout" instead.
  const canSeePrice = user?.role === "admin" || user?.role === "super_admin";
  const canContinue = !isManager && !!enrollment;

  const handleEnroll = () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    trackConversion("checkout_start", { courseId: course.id });
    router.push(`/checkout/${course.id}`);
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    // The heart lives inside the <Link> wrapper that points at the course
    // detail page. Stop the event so clicking the heart doesn't navigate.
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal("register");
      return;
    }
    if (wishlistToggling) return;

    const wasWishlisted = wishlisted;
    setWishlistToggling(true);
    // Optimistic update — revert on failure so the UI never lies.
    setWishlisted(!wasWishlisted);

    try {
      if (wasWishlisted) {
        await api.removeFromWishlist(course.id);
        toast.success("Removed from wishlist");
      } else {
        await api.addToWishlist(course.id);
        toast.success("Saved to wishlist");
      }
      onWishlistToggle?.(course.id, !wasWishlisted);
    } catch (err) {
      setWishlisted(wasWishlisted);
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not update wishlist. Try again.";
      toast.error(msg);
    } finally {
      setWishlistToggling(false);
    }
  };

  return (
    <Card className="card-lift group relative flex h-full flex-col overflow-hidden p-0">
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
          className={`absolute bottom-3 left-3 border ${levelBadgeClass(course.level)}`}
        >
          {course.level}
        </Badge>
      </Link>

      {/* Wishlist heart — only for logged-in users. Sits over the top-right
          corner of the image, above the hover gradient. */}
      {user && (
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishlistToggling || wishlistLoading}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {wishlistToggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart
              className={`h-4 w-4 transition-all ${
                wishlisted ? "fill-rose-500 text-rose-500" : "text-rose-500"
              }`}
            />
          )}
        </button>
      )}

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
