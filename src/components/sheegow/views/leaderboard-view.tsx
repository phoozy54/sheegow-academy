"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Trophy, Flame, Star, Crown, Medal, Award } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * LeaderboardView — top 10 students by points + the viewer's own rank.
 *
 * Mobile: vertical cards. Desktop: a single table.
 * The current viewer's row (when in the top 10) is highlighted with a
 * contrasting background so they can find themselves at a glance.
 */
export function LeaderboardView() {
  const t = useT();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .leaderboard()
      .then((r) => active && setData(r))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const entries = data?.entries ?? [];
  const currentUser = data?.currentUser ?? null;
  const currentUserRank = data?.currentUserRank ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
          <Trophy className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("leaderboard.studentLeaderboard")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          {t("leaderboard.desc")}
        </p>
      </div>

      {/* Your rank callout */}
      {loading ? null : currentUser ? (
        <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <Star className="h-5 w-5 fill-white" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {t("leaderboard.yourRank")}
                </p>
                <p className="text-lg font-extrabold text-foreground">
                  #{currentUserRank}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    {currentUser.points.toLocaleString()} {t("leaderboard.points")}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              {currentUser.currentStreak}{t("leaderboard.dayStreak")}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 border-dashed bg-muted/30 p-4 text-center sm:p-5">
          <p className="text-sm text-muted-foreground">
            {currentUserRank === null ? t("leaderboard.loginToRank") : t("leaderboard.keepLearning")}
          </p>
        </Card>
      )}

      {/* Leaderboard card */}
      <Card className="p-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Medal className="h-4 w-4" />
            </span>
            {t("leaderboard.top10")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("leaderboard.rankedByPoints")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("leaderboard.noRankedStudents")}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {t("leaderboard.beFirst")}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="divide-y md:hidden">
                {entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.studentId}
                    entry={entry}
                    isCurrentUser={!!currentUser && currentUser.studentId === entry.studentId}
                    compact
                  />
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-16 px-4 py-3 text-center">{t("leaderboard.rank")}</th>
                      <th className="px-4 py-3">{t("leaderboard.student")}</th>
                      <th className="px-4 py-3 text-right">{t("leaderboard.points")}</th>
                      <th className="px-4 py-3 text-right">{t("leaderboard.streak")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => {
                      const isMe =
                        !!currentUser &&
                        currentUser.studentId === entry.studentId;
                      return (
                        <tr
                          key={entry.studentId}
                          className={
                            isMe
                              ? "bg-emerald-50/70 hover:bg-emerald-50"
                              : "hover:bg-muted/30"
                          }
                        >
                          <td className="px-4 py-3 text-center">
                            <RankPill rank={entry.rank} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={entry.profilePicture || undefined} />
                                <AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-700">
                                  {entry.fullName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {entry.fullName}
                                  {isMe && (
                                    <UiBadge
                                      variant="outline"
                                      className="ml-2 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                                    >
                                      {t("leaderboard.you")}
                                    </UiBadge>
                                  )}
                                </p>
                                {entry.username && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    @{entry.username}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                              {entry.points.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-orange-600">
                              <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                              {entry.currentStreak}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How to earn points */}
      <Card className="mt-6 p-4 sm:p-6">
        <CardHeader className="p-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Award className="h-4 w-4" />
            </span>
            {t("leaderboard.howToEarn")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: t("leaderboard.completeLesson"), points: 10 },
              { label: t("leaderboard.passQuiz"), points: 20 },
              { label: t("leaderboard.attendLive"), points: 15 },
              { label: t("leaderboard.submitAssignment"), points: 15 },
              { label: t("leaderboard.postThread"), points: 5 },
              { label: t("leaderboard.dailyStreak"), points: null },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
              >
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {row.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                  {row.points === null ? (
                    <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                  ) : (
                    <>
                      +{row.points}
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("leaderboard.visitDashboard")}
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <a href="/dashboard">{t("leaderboard.goToDashboard")}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
  compact,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  compact?: boolean;
}) {
  const t = useT();
  void compact;
  return (
    <li
      className={`flex items-center gap-3 p-4 ${
        isCurrentUser ? "bg-emerald-50/70" : ""
      }`}
    >
      <RankPill rank={entry.rank} />
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={entry.profilePicture || undefined} />
        <AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-700">
          {entry.fullName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {entry.fullName}
          {isCurrentUser && (
            <UiBadge
              variant="outline"
              className="ml-2 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              {t("leaderboard.you")}
            </UiBadge>
          )}
        </p>
        {entry.username && (
          <p className="truncate text-xs text-muted-foreground">
            @{entry.username}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          {entry.points.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-orange-600">
          <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
          {entry.currentStreak}d
        </span>
      </div>
    </li>
  );
}

function RankPill({ rank }: { rank: number }) {
  const t = useT();
  let icon: React.ReactNode = null;
  let className = "bg-muted text-muted-foreground";
  if (rank === 1) {
    icon = <Crown className="h-4 w-4" />;
    className = "bg-gradient-to-br from-amber-300 to-amber-500 text-white";
  } else if (rank === 2) {
    icon = <Medal className="h-4 w-4" />;
    className = "bg-gradient-to-br from-slate-300 to-slate-400 text-white";
  } else if (rank === 3) {
    icon = <Award className="h-4 w-4" />;
    className = "bg-gradient-to-br from-orange-300 to-orange-500 text-white";
  }
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${className}`}
      aria-label={`Rank ${rank}`}
    >
      {icon ?? rank}
    </span>
  );
}
