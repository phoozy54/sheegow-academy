"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, CheckCircle2, GraduationCap, ShieldX } from "lucide-react";

type Verification = Awaited<ReturnType<typeof api.verifyCertificate>>;

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const code = typeof params?.code === "string" ? params.code : "";
  const [data, setData] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    let active = true;
    api
      .verifyCertificate(code)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Certificate not found");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-amber-50/30 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">
            SHEEGOW ACADEMY
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Certificate Verification
          </h1>
        </div>

        {loading ? (
          <Skeleton className="h-80 w-full rounded-2xl" />
        ) : error || !data ? (
          <Card className="p-10 text-center">
            <ShieldX className="mx-auto mb-3 h-12 w-12 text-red-500" />
            <h2 className="text-xl font-bold">Certificate not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We could not verify this code. It may be incorrect or revoked.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-2 border-indigo-100 shadow-xl">
            <div className="border-b bg-gradient-to-br from-white via-indigo-50 to-amber-50 px-8 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
                <Award className="h-8 w-8" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-500">
                Certificate of Completion
              </p>
              <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
              <p className="mt-1 text-2xl font-extrabold text-indigo-800">{data.holderName}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                has successfully completed the course
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{data.courseTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Instructor / Issuer: <span className="font-semibold text-foreground">{data.issuerName}</span>
              </p>
            </div>
            <div className="grid gap-4 bg-white p-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Serial</p>
                <p className="mt-1 font-mono text-sm font-bold">{data.serial}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Date(data.issuedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <div className="mt-1">
                  {data.valid ? (
                    <Badge className="gap-1 bg-emerald-600 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Revoked</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t bg-muted/30 px-6 py-4 text-center text-xs text-muted-foreground">
              Issued by {data.academy}. Verification code: <span className="font-mono">{code}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
