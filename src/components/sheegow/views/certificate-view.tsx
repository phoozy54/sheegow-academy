"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Certificate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, ExternalLink, Loader2, LogIn } from "lucide-react";
import { useT } from "@/lib/i18n";

export function CertificateView() {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .certificates()
      .then((r) => {
        if (active) setCertificates(r.certificates);
      })
      .catch(() => {
        if (active) setCertificates([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <LogIn className="mx-auto mb-3 h-8 w-8 text-indigo-500" />
        <h1 className="text-xl font-bold">{t("certificate.loginToView")}</h1>
        <Button className="mt-4" onClick={() => openAuthModal("login")}>
          Log in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => router.push("/dashboard")}>
          {t("certificate.dashboard")}
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <Award className="h-7 w-7 text-amber-500" /> {t("certificate.myCertificates")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("certificate.desc")}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h2 className="font-bold">{t("certificate.noCertificates")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("certificate.noCertificatesDesc")}
          </p>
          <Button className="mt-4" onClick={() => router.push("/courses")}>
            Continue learning
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    {t("certificate.certificateLabel")}
                  </p>
                  <p className="mt-1 font-bold">{cert.serial}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("certificate.issued")}{" "}
                    {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>
              <a
                href={`/verify/${cert.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
              >
                {t("certificate.viewVerify")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
