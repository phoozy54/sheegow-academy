"use client";

/**
 * Referral dashboard widget.
 *
 * Surfaces the caller's referral code, shareable link, and aggregate stats
 * (friends referred + discount earned). Includes an "apply a code" panel so
 * students who were given a friend's code can redeem it for a one-time
 * discount coupon directly from the dashboard.
 *
 * Mounted inside the student dashboard. Self-contained: it loads its own
 * data, handles loading + error states, and falls back to a "Generate my
 * code" CTA when the user hasn't claimed one yet.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { ReferralStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gift,
  Copy,
  Share2,
  Users,
  Percent,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

/** Default discount shown in the "share with a friend" copy. */
const REFERRAL_DISCOUNT = 10;

/** Best-effort clipboard helper. Falls back to a hidden textarea + execCommand
 *  for browsers that don't expose navigator.clipboard (older Safari, etc.). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ReferralWidget() {
  const t = useT();
  const { user, openAuthModal } = useStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applyValue, setApplyValue] = useState("");
  const [applying, setApplying] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .referralStats()
      .then((r) => setStats(r))
      .catch(() => {
        /* silent — widget is best-effort, never blocks the dashboard */
        setStats(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const r = await api.generateReferralCode();
      setStats(r.code);
      toast.success(t("referral.title"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("referral.loadFailed");
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!stats?.code) return;
    const ok = await copyText(stats.code.code);
    if (ok) toast.success(t("referral.copied"));
    else toast.error(t("referral.copyFailed"));
  };

  const handleCopyLink = async () => {
    if (!stats?.code) return;
    const link = buildReferralLink(stats.code.code);
    const ok = await copyText(link);
    if (ok) toast.success(t("referral.copied"));
    else toast.error(t("referral.copyFailed"));
  };

  const handleShare = async () => {
    if (!stats?.code) return;
    const link = buildReferralLink(stats.code.code);
    const shareData = {
      title: t("referral.title"),
      text: t("referral.statsHint", { discount: REFERRAL_DISCOUNT }),
      url: link,
    };
    // Use the native share sheet on capable devices (mobile browsers, modern
    // desktop Chromium). Fall back to clipboard copy everywhere else.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user dismissed or share failed — fall through to copy */
      }
    }
    const ok = await copyText(link);
    if (ok) toast.success(t("referral.copied"));
    else toast.error(t("referral.copyFailed"));
  };

  const handleApply = async () => {
    const code = applyValue.trim();
    if (!code) {
      toast.error(t("referral.applyPlaceholder"));
      return;
    }
    if (applying) return;
    setApplying(true);
    try {
      const r = await api.applyReferralCode({ code });
      toast.success(
        t("referral.appliedTitle") +
          " — " +
          t("referral.appliedDesc", {
            discount: r.discount,
            code: r.couponCode,
          })
      );
      setApplyValue("");
      load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("referral.invalidCode");
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-emerald-50/60 to-amber-50/40">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Gift className="h-4 w-4" />
            </span>
            {t("referral.title")}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            {t("referral.subtitle")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !stats?.code ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("referral.statsHint", { discount: REFERRAL_DISCOUNT })}
            </p>
            <Button
              onClick={() => {
                if (!user) {
                  openAuthModal("register");
                  return;
                }
                void handleGenerate();
              }}
              disabled={generating}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? t("referral.generating") : t("referral.generate")}
            </Button>
          </div>
        ) : (
          <>
            {/* Code + link share */}
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("referral.yourCode")}
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2.5">
                    <span className="font-mono text-lg font-extrabold tracking-widest text-emerald-700">
                      {stats.code.code}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="gap-1.5"
                    aria-label={t("referral.copyCode")}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("referral.copyCode")}</span>
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("referral.yourLink")}
                </p>
                <div className="flex items-stretch gap-2">
                  <Input
                    readOnly
                    value={buildReferralLink(stats.code.code)}
                    className="flex-1 truncate font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="gap-1.5"
                    aria-label={t("referral.copyLink")}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("referral.copyLink")}</span>
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleShare}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Share2 className="h-4 w-4" />
                {t("referral.share")}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-500" />
                  {t("referral.friendsReferred")}
                </div>
                <p className="text-2xl font-extrabold text-foreground">
                  {stats.totalReferrals}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Percent className="h-3.5 w-3.5 text-amber-500" />
                  {t("referral.discountEarned")}
                </div>
                <p className="text-2xl font-extrabold text-foreground">
                  {stats.totalDiscountEarned}%
                </p>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("referral.statsHint", { discount: REFERRAL_DISCOUNT })}
            </p>
          </>
        )}

        {/* Apply a code (only when the caller hasn't been referred yet). */}
        {!loading && stats && !stats.wasReferred && (
          <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
            <p className="text-sm font-bold text-foreground">
              {t("referral.applyTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("referral.applyDesc")}
            </p>
            <div className="mt-2.5 flex items-stretch gap-2">
              <Input
                value={applyValue}
                onChange={(e) => setApplyValue(e.target.value.toUpperCase())}
                placeholder={t("referral.applyPlaceholder")}
                className="flex-1 font-mono uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !applying) {
                    e.preventDefault();
                    void handleApply();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleApply}
                disabled={applying || !applyValue.trim()}
                className="gap-1.5 bg-amber-500 hover:bg-amber-600"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {applying ? t("referral.applying") : t("referral.apply")}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Referred badge */}
        {!loading && stats?.wasReferred && (
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {t("referral.appliedTitle")}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/** Build the shareable referral link from a code. */
function buildReferralLink(code: string): string {
  if (typeof window === "undefined") {
    return `https://sheegowacademy.com/?ref=${code}`;
  }
  return `${window.location.origin}/?ref=${code}`;
}
