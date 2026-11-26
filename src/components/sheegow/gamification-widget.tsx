"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { GamificationData } from "@/lib/types";
import {
  BADGE_METADATA,
  type BadgeMetadata,
} from "@/lib/badge-metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Flame,
  Star,
  Trophy,
  Lock,
  ArrowRight,
  Award,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * GamificationWidget — shown on the student dashboard overview.
 *
 * Renders three things in one card:
 *   1. Points (big number + star)
 *   2. Current streak (flame + "X day streak")
 *   3. Badge grid (earned = colored, unearned = grayed out with a lock)
 *
 * Every badge has a tooltip explaining how to earn it, so students always
 * know what to do next. The whole card links through to /leaderboard for the
 * full ranking view.
 */
export function GamificationWidget() {
  const t = useT();
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .gamification()
      .then((r) => active && setData(r))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-0">
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="col-span-2 h-24 w-full sm:col-span-3" />
        </CardContent>
      </Card>
    );
  }

  const points = data?.points ?? 0;
  const currentStreak = data?.currentStreak ?? 0;
  const longestStreak = data?.longestStreak ?? 0;
  const earnedTypes = new Set((data?.badges ?? []).map((b) => b.type));

  return (
    <Card className="p-0">
      <CardHeader className="flex-row items-center justify-between border-b">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Trophy className="h-4 w-4" />
            </span>
            {t("gamification.yourProgress")}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            {t("gamification.widgetDesc")}
          </CardDescription>
        </div>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Link href="/leaderboard">
            {t("gamification.leaderboard")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {/* Points + Streak tiles */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none text-foreground">
                {points.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("gamification.pointsEarned")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-br from-orange-50 to-white p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Flame
                className={`h-5 w-5 ${currentStreak > 0 ? "fill-orange-500 text-orange-500" : ""}`}
              />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none text-foreground">
                {currentStreak}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">
                  {currentStreak === 1 ? t("gamification.daySingular") : t("gamification.dayPlural")}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("gamification.currentStreak", { count: longestStreak })}
              </p>
            </div>
          </div>
        </div>

        {/* Badge grid */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t("gamification.badges")}</h3>
            <UiBadge variant="secondary" className="text-xs font-semibold">
              {t("gamification.earnedCount", { earned: earnedTypes.size, total: BADGE_METADATA.length })}
            </UiBadge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BADGE_METADATA.map((meta) => (
              <BadgeTile
                key={meta.type}
                meta={meta}
                earned={earnedTypes.has(meta.type)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeTile({
  meta,
  earned,
}: {
  meta: BadgeMetadata;
  earned: boolean;
}) {
  const t = useT();
  const Icon = meta.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
            earned
              ? meta.color
              : "border-border bg-muted/40 text-muted-foreground"
          }`}
          aria-label={`${meta.title}${earned ? ` — ${t("gamification.earnedSuffix")}` : ` — ${t("gamification.lockedSuffix")}`}`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              earned ? meta.iconBg : "bg-muted text-muted-foreground"
            }`}
          >
            {earned ? (
              <Icon className="h-5 w-5" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </span>
          <span className="text-[11px] font-semibold leading-tight">
            {meta.title}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-center">
        <div className="space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-semibold">
            {earned ? (
              <Award className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {meta.title}
          </p>
          <p className="text-[11px] leading-snug opacity-90">
            {earned ? meta.description : meta.howToEarn}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
