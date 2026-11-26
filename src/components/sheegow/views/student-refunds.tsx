"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { RefundRequest } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatPrice } from "@/lib/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "approved") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" /> {t("refunds.approvedBadge")}
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-rose-200 bg-rose-50 text-rose-700">
        <XCircle className="mr-1 h-3 w-3" /> {t("refunds.rejectedBadge")}
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
      <Clock className="mr-1 h-3 w-3" /> {t("refunds.pendingBadge")}
    </Badge>
  );
}

/**
 * Student-facing refund request list. Mirrors the admin queue but limited to the
 * current student's own requests. Each card shows the course, amount, the
 * student's original reason, the current status (green / red / amber) and the
 * admin note (when present).
 *
 * Mobile and tablet get card layout; desktop gets a table.
 */
export function StudentRefunds() {
  const t = useT();
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.refunds();
      setRequests(res.refunds);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load refund requests"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const refundedTotal = requests
      .filter((r) => r.status === "approved" && r.payment)
      .reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0);
    return { pending, approved, refundedTotal, total: requests.length };
  }, [requests]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("refunds.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("refunds.desc")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> {t("refunds.refresh")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <RotateCcw className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("refunds.totalRequests")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary.pending}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("refunds.pending")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary.approved}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("refunds.approved")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <DollarSign className="mb-2 h-5 w-5 text-fuchsia-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {formatPrice(summary.refundedTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("refunds.refunded")}</p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-10 text-center">
          <RotateCcw className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">{t("refunds.noRequests")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("refunds.noRequestsDesc")}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile / tablet cards */}
          <div className="space-y-3 md:hidden">
            {requests.map((r) => {
              const payment = r.payment;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {payment ? formatPrice(payment.amount) : "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {payment?.course?.title ?? "Payment"}
                      </p>
                    </div>
                    {statusBadge(r.status, t)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("refunds.requested")} {formatDate(r.createdAt)}
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("refunds.yourReason")}
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-sm text-foreground">
                      {r.reason}
                    </p>
                  </div>
                  {r.adminNote && (
                    <div className="mt-2 rounded-lg border bg-muted/30 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("refunds.adminNote")}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground">
                        {r.adminNote}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("refunds.course")}</th>
                  <th className="px-4 py-3">{t("refunds.amount")}</th>
                  <th className="px-4 py-3">{t("refunds.reason")}</th>
                  <th className="px-4 py-3">{t("refunds.requestedLabel")}</th>
                  <th className="px-4 py-3">{t("refunds.reviewed")}</th>
                  <th className="px-4 py-3">{t("refunds.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((r) => {
                  const payment = r.payment;
                  return (
                    <tr key={r.id} className="align-top hover:bg-muted/30">
                      <td className="max-w-44 truncate px-4 py-3 font-medium">
                        {payment?.course?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {payment ? formatPrice(payment.amount) : "—"}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {r.reason}
                        </p>
                        {r.adminNote && (
                          <p
                            className={cn(
                              "mt-1 line-clamp-2 text-[11px] italic",
                              r.status === "approved"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            )}
                          >
                            Admin: {r.adminNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.reviewedAt ? formatDateTime(r.reviewedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(r.status, t)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
