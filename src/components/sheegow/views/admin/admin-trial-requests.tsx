"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TrialRequest } from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Filter = "pending" | "all";

function isPending(r: TrialRequest) {
  return r.status === "pending";
}

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "completed") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        {t("admin.trial.approved")}
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="border-rose-200 bg-rose-50 text-rose-700">
        {t("admin.trial.rejected")}
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
      {t("admin.trial.pendingBadge")}
    </Badge>
  );
}

export function AdminTrialRequests() {
  const t = useT();
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminTrialRequests();
      setRequests(res.requests);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.trial.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => requests.filter(isPending).length, [requests]);
  const visible = useMemo(
    () => (filter === "pending" ? requests.filter(isPending) : requests),
    [requests, filter]
  );

  async function decide(id: string, action: "approve" | "reject") {
    setActingId(id);
    try {
      await api.decideTrialRequest(id, action);
      toast.success(
        action === "approve"
          ? t("admin.trial.approvedToast")
          : t("admin.trial.rejectedToast")
      );
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("admin.trial.updateFailed")
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
          <h2 className="text-xl font-bold text-foreground">{t("admin.trial.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.trial.intro")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3" /> {t("admin.trial.awaitingReview", { count: pendingCount })}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("admin.trial.refresh")}
          </Button>
        </div>
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
            {f === "pending" ? t("admin.trial.filterPending", { count: pendingCount }) : t("admin.trial.filterAll")}
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
              ? t("admin.trial.noPending")
              : t("admin.trial.noRequests")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.trial.noRequestsDesc")}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const student = r.student;
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
                          {student?.fullName || t("admin.trial.student")}
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

                {/* Class info */}
                <div className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {r.liveClass?.title || t("admin.trial.liveClass")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.liveClass?.scheduledAt
                        ? formatDateTime(r.liveClass.scheduledAt)
                        : t("admin.trial.scheduledNA")}
                      {r.liveClass?.status
                        ? ` · ${r.liveClass.status}`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {isPending(r) && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => decide(r.id, "approve")}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("admin.trial.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => decide(r.id, "reject")}
                      className="gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" /> {t("admin.trial.reject")}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
