"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { RefundRequest } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/ui";
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
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Filter = "pending" | "all";

function isPending(r: RefundRequest) {
  return r.status === "pending";
}

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "approved") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        {t("admin.refunds.approved")}
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-rose-200 bg-rose-50 text-rose-700">
        {t("admin.refunds.rejected")}
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">{t("admin.refunds.pendingBadge")}</Badge>
  );
}

/**
 * Admin / super-admin refund review queue. Lists every refund request with the
 * student, payment and course info so an admin can approve (flips payment to
 * "refunded" + notifies the student) or reject (notifies the student).
 */
export function AdminRefunds() {
  const t = useT();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<RefundRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.refunds();
      setRequests(res.refunds);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.refunds.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => requests.filter(isPending).length,
    [requests]
  );
  const totalRefunded = useMemo(
    () =>
      requests
        .filter((r) => r.status === "approved" && r.payment)
        .reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0),
    [requests]
  );
  const visible = useMemo(
    () => (filter === "pending" ? requests.filter(isPending) : requests),
    [requests, filter]
  );

  function openReview(r: RefundRequest, action: "approved" | "rejected") {
    setReviewing(r);
    setDecision(action);
    setAdminNote("");
  }

  async function submitDecision() {
    if (!reviewing || !decision) return;
    setActingId(reviewing.id);
    try {
      await api.decideRefund(reviewing.id, {
        status: decision,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success(
        decision === "approved"
          ? t("admin.refunds.approvedToast")
          : t("admin.refunds.rejectedToast")
      );
      setReviewing(null);
      setDecision(null);
      setAdminNote("");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.refunds.updateFailed")
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
          <h2 className="text-xl font-bold text-foreground">{t("admin.refunds.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.refunds.intro")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3" /> {t("admin.refunds.awaitingReview", { count: pendingCount })}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("admin.refunds.refresh")}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <Card className="p-3 sm:p-4">
          <RotateCcw className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {requests.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.refunds.totalRequests")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.refunds.pendingReview")}</p>
        </Card>
        <Card className="col-span-2 p-3 sm:p-4 md:col-span-1">
          <DollarSign className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {formatPrice(totalRefunded)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.refunds.totalRefunded")}</p>
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
            {f === "pending" ? t("admin.refunds.filterPending", { count: pendingCount }) : t("admin.refunds.filterAll")}
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
          <RotateCcw className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {filter === "pending"
              ? t("admin.refunds.noPending")
              : t("admin.refunds.noRefunds")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.refunds.noRefundsDesc")}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const student = r.student;
            const payment = r.payment;
            const busy = actingId === r.id;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student?.profilePicture || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                        {(student?.fullName || "ST")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {student?.fullName || t("admin.refunds.student")}
                        </span>
                        {statusBadge(r.status, t)}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {student?.email}
                        {student?.phone ? ` · ${student.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </span>
                </div>

                {/* Payment info */}
                <div className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {payment?.course?.title || t("admin.refunds.payment")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment ? formatPrice(payment.amount) : "—"} ·{" "}
                      {payment?.method ? payment.method : "—"}
                      {payment?.status ? ` · ${t("admin.refunds.paymentStatusSuffix", { status: payment.status })}` : ""}
                    </p>
                  </div>
                  {payment?.status === "completed" && (
                    <a
                      href={`/invoice/${payment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {t("admin.refunds.invoice")}
                    </a>
                  )}
                </div>

                {/* Reason */}
                <div className="mt-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.refunds.studentReason")}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {r.reason}
                  </p>
                </div>

                {/* Admin note (when already reviewed) */}
                {r.status !== "pending" && r.adminNote && (
                  <div className="mt-3 rounded-lg border border-border bg-card p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("admin.refunds.adminNote")}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {r.adminNote}
                    </p>
                    {r.reviewedAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("admin.refunds.reviewed", { date: formatDateTime(r.reviewedAt) })}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {isPending(r) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => openReview(r, "approved")}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("admin.refunds.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openReview(r, "rejected")}
                      className="gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" /> {t("admin.refunds.reject")}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Decision dialog — collect an optional admin note before applying */}
      <Dialog
        open={reviewing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewing(null);
            setDecision(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? t("admin.refunds.approveTitle") : t("admin.refunds.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? t("admin.refunds.approveDesc")
                : t("admin.refunds.rejectDesc")}
            </DialogDescription>
          </DialogHeader>

          {reviewing && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">
                {reviewing.payment?.course?.title || t("admin.refunds.payment")}
              </p>
              <p className="text-xs text-muted-foreground">
                {reviewing.payment ? formatPrice(reviewing.payment.amount) : "—"} ·{" "}
                {reviewing.student?.fullName || t("admin.refunds.student")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="admin-note"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("admin.refunds.adminNoteLabel")}
            </label>
            <Textarea
              id="admin-note"
              placeholder={
                decision === "approved"
                  ? t("admin.refunds.approvePlaceholder")
                  : t("admin.refunds.rejectPlaceholder")
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
                setReviewing(null);
                setDecision(null);
                setAdminNote("");
              }}
              disabled={actingId !== null}
            >
              {t("admin.refunds.cancel")}
            </Button>
            <Button
              onClick={submitDecision}
              disabled={actingId !== null}
              className={cn(
                "gap-1.5",
                decision === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {decision === "approved" ? t("admin.refunds.confirmApproval") : t("admin.refunds.confirmRejection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
