"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/sheegow/app-shell";
import {
  ArrowLeft,
  Download,
  Loader2,
  LogIn,
  ShieldAlert,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatPrice } from "@/lib/ui";
import { NAP, SITE_NAME } from "@/lib/seo";
import { BrandMark } from "@/components/sheegow/brand-mark";

const METHOD_LABELS: Record<string, string> = {
  card: "Credit / Debit Card",
  zaad: "Zaad Service (TELESOM)",
  edahab: "Edahab (E-Dahab)",
};

function methodLabel(method: string) {
  return METHOD_LABELS[method] || method.charAt(0).toUpperCase() + method.slice(1);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "refunded":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export default function InvoicePage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId =
    typeof params?.paymentId === "string" ? params.paymentId : "";
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(() => paymentId !== "");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // No payment id => nothing to fetch. The error message is derived from the
  // paymentId itself so we never need to set it imperatively from an effect.
  const missingPaymentId = !paymentId;

  // Adjust local state when paymentId changes (React's "adjust during render"
  // pattern — safe and recommended by the React docs for derived state).
  const [seenPaymentId, setSeenPaymentId] = useState(paymentId);
  if (paymentId !== seenPaymentId) {
    setSeenPaymentId(paymentId);
    setInvoice(null);
    setError(null);
    setErrorCode(null);
    setLoading(paymentId !== "");
  }

  useEffect(() => {
    if (!paymentId) return;
    let active = true;
    api
      .invoice(paymentId)
      .then((data) => {
        if (active) {
          setInvoice(data);
          setError(null);
          setErrorCode(null);
        }
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError) {
          setError(e.message);
          setErrorCode(e.status);
        } else {
          setError("Could not load invoice.");
          setErrorCode(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [paymentId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      try {
        window.print();
      } catch {
        toast.error("Your browser blocked the print dialog.");
      }
    }
  };

  // The render branches below prefer the synchronous "missing payment id"
  // state over the loading state so users see the right message immediately.
  const showError = missingPaymentId || (!loading && !!error && !invoice);
  const showLoading = !missingPaymentId && loading && !invoice;
  const showInvoice = !missingPaymentId && !loading && !!invoice && !error;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Action bar — hidden when printing */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {invoice && (
            <Button
              onClick={handlePrint}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          )}
        </div>
      </div>

      {showLoading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : showError ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            {errorCode === 401 ? (
              <LogIn className="h-7 w-7 text-indigo-600" />
            ) : errorCode === 403 ? (
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-red-500" />
            )}
          </div>
          <h1 className="mb-2 text-xl font-bold">
            {missingPaymentId
              ? "No payment selected"
              : errorCode === 401
                ? "Please log in"
                : errorCode === 403
                  ? "You can\u2019t view this invoice"
                  : "Invoice unavailable"}
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {missingPaymentId
              ? "Open an invoice from your dashboard or your payment history."
              : errorCode === 401
                ? "You need to be logged in to download an invoice."
                : errorCode === 403
                  ? "You can only download invoices for your own payments. If you think this is a mistake, contact the academy."
                  : error}
          </p>
          {errorCode === 401 && (
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <LogIn className="h-4 w-4" /> Go to login
            </Link>
          )}
        </Card>
      ) : showInvoice && invoice ? (
        <Card className="print-area mx-auto w-full max-w-3xl overflow-hidden border border-border bg-white p-0 shadow-xl">
          {/* Header */}
          <header className="print-avoid-break flex flex-col gap-4 border-b border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30">
                <BrandMark className="h-7 w-7" />
              </span>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-foreground">
                  SHEEGOW ACADEMY
                </p>
                <p className="text-xs text-muted-foreground">
                  {NAP.address}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {NAP.email} · {NAP.phone}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                Payment Receipt
              </p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Issued {formatDateTime(invoice.createdAt)}
              </p>
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(
                  invoice.status
                )}`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {invoice.status}
              </span>
            </div>
          </header>

          {/* Bill-to + course summary */}
          <section className="print-avoid-break grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Bill to
              </p>
              <p className="mt-1 text-base font-bold text-foreground">
                {invoice.student.fullName}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                {invoice.student.email}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Course
              </p>
              <p className="mt-1 text-base font-bold text-foreground">
                {invoice.course?.title ?? "—"}
              </p>
              {invoice.course?.level && (
                <p className="text-sm text-muted-foreground">
                  Level: {invoice.course.level}
                </p>
              )}
            </div>
          </section>

          {/* Line items */}
          <section className="print-avoid-break px-6 sm:px-8">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">
                        {invoice.course?.title ?? "Course enrollment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Live English class — {methodLabel(invoice.method)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPrice(invoice.amount)}
                    </td>
                  </tr>
                  {invoice.couponCode && (
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">Coupon</p>
                        <p className="text-xs text-muted-foreground">
                          Code: <span className="font-mono">{invoice.couponCode}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        Applied at checkout
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-indigo-100 bg-indigo-50/40">
                    <td className="px-4 py-3 text-sm font-bold uppercase tracking-wide text-foreground">
                      Total paid
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-extrabold text-foreground">
                      {formatPrice(invoice.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Payment details */}
          <section className="print-avoid-break grid gap-4 p-6 text-sm sm:grid-cols-2 sm:p-8">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Payment method
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {methodLabel(invoice.method)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Transaction ID
              </p>
              <p className="mt-1 break-all font-mono text-xs text-foreground">
                {invoice.transactionId || "—"}
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="print-avoid-break border-t bg-muted/20 p-6 text-center sm:p-8">
            <p className="text-sm font-semibold text-foreground">
              Thank you for learning with {SITE_NAME}
            </p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-muted-foreground">
              This receipt confirms your payment and enrollment. Keep it for
              your records. For questions about your invoice, email {NAP.email}
              {" "}or call {NAP.phone}.
            </p>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Generated {formatDateTime(new Date().toISOString())} ·{" "}
              {invoice.invoiceNumber}
            </p>
          </footer>

          {/* Print-only call to action — hidden on screen */}
          <div className="no-print mt-4 flex flex-col items-center gap-2 pb-8 text-center">
            <p className="text-xs text-muted-foreground">
              Click below to save this invoice as a PDF.
            </p>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="gap-2"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>
        </Card>
      ) : null}

      {showLoading && (
        <div className="no-print mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading invoice…
        </div>
      )}
      </div>
    </AppShell>
  );
}
