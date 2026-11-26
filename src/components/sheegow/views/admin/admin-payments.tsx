"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Payment } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  RotateCcw,
  CreditCard,
  ShieldAlert,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type AdminPayment = Payment & {
  student?: { id: string; fullName: string; email: string } | null;
  course?: { id: string; title: string } | null;
};

interface Summary {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  refunded: number;
  revenue: number;
}

const STATUSES = ["pending", "completed", "failed", "refunded"];
const METHODS = ["card", "zaad", "edahab"];

const METHOD_LABELS: Record<string, string> = {
  card: "admin.payments.methodCard",
  zaad: "admin.payments.methodZaad",
  edahab: "admin.payments.methodEdahab",
};

function methodLabel(method: string) {
  const key = METHOD_LABELS[method];
  return key || method.charAt(0).toUpperCase() + method.slice(1);
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "refunded":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export function AdminPayments({ canManage = false }: { canManage?: boolean }) {
  const t = useT();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.allPayments({
        status: statusFilter === "all" ? undefined : statusFilter,
        method: methodFilter === "all" ? undefined : methodFilter,
      });
      setPayments(res.payments as AdminPayment[]);
      setSummary(res.summary);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.payments.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      await api.updatePaymentStatus(id, status);
      toast.success(t("admin.payments.statusUpdatedToast"));
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.payments.updateFailed")
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <DollarSign className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {formatPrice(summary?.revenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.payments.completedRevenue")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary?.completed ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.payments.completed")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary?.pending ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.payments.pending")}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <RotateCcw className="mb-2 h-5 w-5 text-fuchsia-600" />
          <p className="text-xl font-extrabold leading-none sm:text-2xl">
            {summary?.refunded ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.payments.refunded")}</p>
        </Card>
      </div>

      {!canManage && (
        <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("admin.payments.viewOnly")}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("admin.payments.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.payments.allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("admin.payments.allMethods")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.payments.allMethods")}</SelectItem>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {t(methodLabel(m))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card className="p-10 text-center">
          <CreditCard className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-semibold">{t("admin.payments.noPayments")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.payments.noPaymentsDesc")}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {payments.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {formatPrice(p.amount)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.student?.fullName ?? t("admin.payments.unknownStudent")} ·{" "}
                      {t(methodLabel(p.method))}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusClass(p.status)}>
                    {p.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {p.course?.title ?? t("admin.payments.noCourse")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(p.createdAt)}
                </p>
                {p.status === "completed" && (
                  <a
                    href={`/invoice/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Download className="h-3.5 w-3.5" /> {t("admin.payments.invoice")}
                  </a>
                )}
                {canManage && (
                  <div className="mt-3 flex gap-2">
                    {STATUSES.filter((s) => s !== p.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={updatingId === p.id}
                        onClick={() => changeStatus(p.id, s)}
                        className="flex-1 text-xs"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("admin.payments.colStudent")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colCourse")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colAmount")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colMethod")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colDate")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colStatus")}</th>
                  <th className="px-4 py-3">{t("admin.payments.colInvoice")}</th>
                  {canManage && <th className="px-4 py-3">{t("admin.payments.colChange")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.student?.fullName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.student?.email}
                      </p>
                    </td>
                    <td className="max-w-52 truncate px-4 py-3">
                      {p.course?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(p.amount)}
                    </td>
                    <td className="px-4 py-3">{t(methodLabel(p.method))}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusClass(p.status)}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "completed" ? (
                        <a
                          href={`/invoice/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <Download className="h-3.5 w-3.5" /> {t("admin.payments.download")}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <Select
                          value={p.status}
                          onValueChange={(v) => changeStatus(p.id, v)}
                          disabled={updatingId === p.id}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
