"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  TeacherApplication,
  TeacherApplicationStatus,
} from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Globe,
  GraduationCap,
  Languages,
  Briefcase,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Filter = "pending" | "all";
type Decision =
  | "under_review"
  | "approved"
  | "rejected";

/* ─── Status badge ─────────────────────────────────────── */

function statusBadge(
  status: TeacherApplicationStatus,
  t: (k: string) => string
) {
  switch (status) {
    case "approved":
      return (
        <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> {t("teach.statusApproved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="gap-1 border-rose-200 bg-rose-50 text-rose-700">
          <XCircle className="h-3 w-3" /> {t("teach.statusRejected")}
        </Badge>
      );
    case "under_review":
      return (
        <Badge className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700">
          <Loader2 className="h-3 w-3" /> {t("teach.statusUnderReview")}
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
          <Clock className="h-3 w-3" /> {t("teach.statusPending")}
        </Badge>
      );
  }
}

/** Map a stored availability key to its translated label. */
function availabilityLabel(key: string, t: (k: string) => string): string {
  // The applicant stored a translation key (teach.availability*); fall back to
  // the raw value when it isn't one of our keys.
  if (key.startsWith("teach.availability")) return t(key);
  return key;
}

/** Map a stored experience bucket to its translated label. */
function experienceLabel(bucket: string, t: (k: string) => string): string {
  switch (bucket) {
    case "0":
      return t("teach.experienceNone");
    case "1-3":
      return t("teach.experience1to3");
    case "3-5":
      return t("teach.experience3to5");
    case "5-10":
      return t("teach.experience5to10");
    case "10+":
      return t("teach.experience10plus");
    default:
      return bucket;
  }
}

/* ─── Main admin view ──────────────────────────────────── */

export function AdminTeacherApplications() {
  const t = useT();
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  // Detail dialog
  const [viewing, setViewing] = useState<TeacherApplication | null>(null);

  // Decision dialog
  const [deciding, setDeciding] = useState<TeacherApplication | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.teacherApplications();
      setApplications(res.applications);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to load teacher applications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isPending = useCallback(
    (a: TeacherApplication) =>
      a.status === "pending" || a.status === "under_review",
    []
  );

  const pendingCount = useMemo(
    () => applications.filter((a) => isPending(a)).length,
    [applications, isPending]
  );

  const approvedCount = useMemo(
    () => applications.filter((a) => a.status === "approved").length,
    [applications]
  );

  const rejectedCount = useMemo(
    () => applications.filter((a) => a.status === "rejected").length,
    [applications]
  );

  const visible = useMemo(
    () =>
      filter === "pending" ? applications.filter(isPending) : applications,
    [applications, filter, isPending]
  );

  function openDecision(a: TeacherApplication, d: Decision) {
    setDeciding(a);
    setDecision(d);
    setAdminNote("");
  }

  async function submitDecision() {
    if (!deciding || !decision) return;
    setActingId(deciding.id);
    try {
      await api.decideTeacherApplication(deciding.id, {
        status: decision,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success(
        decision === "approved"
          ? t("teach.adminApprovedToast")
          : decision === "rejected"
          ? t("teach.adminRejectedToast")
          : t("teach.adminReviewToast")
      );
      setDeciding(null);
      setDecision(null);
      setAdminNote("");
      // Keep the detail dialog in sync if it's the same application.
      if (viewing && viewing.id === deciding.id) {
        setViewing(null);
      }
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to update the application"
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {t("teach.adminTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("teach.adminDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3" /> {pendingCount} {t("teach.adminReviewQueue")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <ClipboardCheck className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {applications.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("teach.adminTitle")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("teach.statusPending")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {approvedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("teach.statusApproved")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <XCircle className="mb-2 h-5 w-5 text-rose-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {rejectedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("teach.statusRejected")}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["pending", "all"] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(filter === f && "bg-indigo-600 hover:bg-indigo-700")}
          >
            {f === "pending"
              ? `${t("teach.adminFilterPending")} (${pendingCount})`
              : t("teach.adminFilterAll")}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
            </Card>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {filter === "pending"
              ? t("teach.adminNoPending")
              : t("teach.adminNoApplications")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "pending"
              ? t("teach.adminNoPendingDesc")
              : t("teach.adminNoApplicationsDesc")}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("teach.adminTableApplicant")}</th>
                  <th className="px-4 py-3">{t("teach.adminTableExperience")}</th>
                  <th className="px-4 py-3">{t("teach.adminTableEnglish")}</th>
                  <th className="px-4 py-3">{t("teach.adminTableStatus")}</th>
                  <th className="px-4 py-3">{t("teach.adminTableDate")}</th>
                  <th className="px-4 py-3 text-right">{t("teach.adminTableActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((a) => {
                  const busy = actingId === a.id;
                  const canAct = isPending(a);
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={a.applicant?.profilePicture || undefined}
                            />
                            <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                              {a.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {a.fullName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {a.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {experienceLabel(a.teachingExperience, t)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.englishLevel}
                      </td>
                      <td className="px-4 py-3">{statusBadge(a.status, t)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewing(a)}
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t("teach.adminView")}
                          </Button>
                          {canAct && (
                            <>
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => openDecision(a, "approved")}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t("teach.adminApprove")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => openDecision(a, "rejected")}
                                className="gap-1.5"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {t("teach.adminReject")}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile / tablet cards */}
          <div className="space-y-3 md:hidden">
            {visible.map((a) => {
              const busy = actingId === a.id;
              const canAct = isPending(a);
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={a.applicant?.profilePicture || undefined}
                        />
                        <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                          {a.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {a.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.email}
                        </p>
                      </div>
                    </div>
                    {statusBadge(a.status, t)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold text-foreground">
                        {t("teach.adminTableExperience")}:
                      </span>{" "}
                      {experienceLabel(a.teachingExperience, t)}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">
                        {t("teach.adminTableEnglish")}:
                      </span>{" "}
                      {a.englishLevel}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">
                        {t("teach.adminTableDate")}:
                      </span>{" "}
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewing(a)}
                      className="gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("teach.adminView")}
                    </Button>
                    {canAct && (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => openDecision(a, "approved")}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("teach.adminApprove")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => openDecision(a, "rejected")}
                          className="gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t("teach.adminReject")}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open && actingId === null) setViewing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.fullName}</DialogTitle>
            <DialogDescription>
              {t("teach.adminCurrentStatus")}:{" "}
              {viewing ? statusBadge(viewing.status, t) : null}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5">
              {/* Personal */}
              <DetailSection
                title={t("teach.adminDetailPersonal")}
                icon={Mail}
              >
                <DetailRow
                  icon={Mail}
                  label={t("teach.email")}
                  value={viewing.email}
                />
                <DetailRow
                  icon={Phone}
                  label={t("teach.phone")}
                  value={viewing.phone}
                />
                <DetailRow
                  icon={MapPin}
                  label={`${t("teach.city")} / ${t("teach.country")}`}
                  value={`${viewing.city}, ${viewing.country}`}
                />
              </DetailSection>

              {/* Language & experience */}
              <DetailSection
                title={t("teach.adminDetailLanguage")}
                icon={Languages}
              >
                <DetailRow
                  icon={Languages}
                  label={t("teach.nativeLanguage")}
                  value={viewing.nativeLanguage}
                />
                <DetailRow
                  icon={Languages}
                  label={t("teach.englishLevel")}
                  value={viewing.englishLevel}
                />
                <DetailRow
                  icon={Briefcase}
                  label={t("teach.teachingExperience")}
                  value={experienceLabel(viewing.teachingExperience, t)}
                />
                {viewing.certifications && (
                  <DetailRow
                    icon={GraduationCap}
                    label={t("teach.certifications")}
                    value={viewing.certifications}
                  />
                )}
              </DetailSection>

              {/* About */}
              <DetailSection
                title={t("teach.adminDetailAbout")}
                icon={Briefcase}
              >
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("teach.bio")}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {viewing.bio}
                  </p>
                </div>
                {viewing.teachingPhilosophy && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("teach.teachingPhilosophy")}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {viewing.teachingPhilosophy}
                    </p>
                  </div>
                )}
              </DetailSection>

              {/* Portfolio */}
              {(viewing.sampleLesson ||
                viewing.linkedinUrl ||
                viewing.resumeUrl) && (
                <DetailSection
                  title={t("teach.adminDetailPortfolio")}
                  icon={Globe}
                >
                  {viewing.sampleLesson && (
                    <ExternalLinkRow
                      label={t("teach.sampleLesson")}
                      href={viewing.sampleLesson}
                    />
                  )}
                  {viewing.linkedinUrl && (
                    <ExternalLinkRow
                      label={t("teach.linkedinUrl")}
                      href={viewing.linkedinUrl}
                    />
                  )}
                  {viewing.resumeUrl && (
                    <ExternalLinkRow
                      label={t("teach.resumeUrl")}
                      href={viewing.resumeUrl}
                    />
                  )}
                </DetailSection>
              )}

              {/* Preferences */}
              <DetailSection
                title={t("teach.adminDetailPreferences")}
                icon={CalendarClock}
              >
                {viewing.preferredCourses && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("teach.preferredCourses")}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {viewing.preferredCourses}
                    </p>
                  </div>
                )}
                <DetailRow
                  icon={CalendarClock}
                  label={t("teach.availability")}
                  value={availabilityLabel(viewing.availability, t)}
                />
              </DetailSection>

              {/* Admin note / reviewer */}
              {viewing.status !== "pending" && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("teach.adminNoteLabel")}
                  </p>
                  {viewing.adminNote ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {viewing.adminNote}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">—</p>
                  )}
                  {viewing.reviewedAt && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t("teach.adminReviewer")}:{" "}
                      {viewing.reviewer?.fullName ?? "—"} ·{" "}
                      {formatDateTime(viewing.reviewedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Inline actions for pending applications */}
              {isPending(viewing) && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {viewing.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actingId !== null}
                        onClick={() => openDecision(viewing, "under_review")}
                        className="gap-1.5"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {t("teach.adminMarkReview")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={actingId !== null}
                      onClick={() => openDecision(viewing, "approved")}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("teach.adminApprove")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId !== null}
                      onClick={() => openDecision(viewing, "rejected")}
                      className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("teach.adminReject")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewing(null)}
              disabled={actingId !== null}
              className="w-full sm:w-auto"
            >
              {t("teach.adminCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision dialog — collect an optional admin note before applying */}
      <Dialog
        open={deciding !== null}
        onOpenChange={(open) => {
          if (!open && actingId === null) {
            setDeciding(null);
            setDecision(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved"
                ? t("teach.adminConfirmApproveTitle")
                : decision === "rejected"
                ? t("teach.adminConfirmRejectTitle")
                : t("teach.adminConfirmReviewTitle")}
            </DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? t("teach.adminConfirmApproveDesc")
                : decision === "rejected"
                ? t("teach.adminConfirmRejectDesc")
                : t("teach.adminConfirmReviewDesc")}
            </DialogDescription>
          </DialogHeader>

          {deciding && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">
                {deciding.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {deciding.email} · {experienceLabel(deciding.teachingExperience, t)}{" "}
                · {deciding.englishLevel}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="ta-admin-note"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("teach.adminNoteOptional")}
            </label>
            <Textarea
              id="ta-admin-note"
              placeholder={
                decision === "approved"
                  ? t("teach.adminNotePlaceholderApprove")
                  : decision === "rejected"
                  ? t("teach.adminNotePlaceholderReject")
                  : t("teach.adminNotePlaceholderReview")
              }
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={actingId !== null}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {adminNote.length}/2000
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeciding(null);
                setDecision(null);
                setAdminNote("");
              }}
              disabled={actingId !== null}
            >
              {t("teach.adminCancel")}
            </Button>
            <Button
              onClick={submitDecision}
              disabled={actingId !== null}
              className={cn(
                "gap-1.5",
                decision === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : decision === "rejected"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {actingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : decision === "approved" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : decision === "rejected" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              {t("teach.adminConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Detail dialog helpers ────────────────────────────── */

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-3">{children}</div>
    </section>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="break-words text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <span className="truncate text-foreground">{label}</span>
      <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
        <ExternalLink className="h-3.5 w-3.5" />
        Open
      </span>
    </a>
  );
}
