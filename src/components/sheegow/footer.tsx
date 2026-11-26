"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrandLockup } from "./brand-mark";

type FooterLink = {
  labelKey: string;
  href?: string;
};

export function Footer() {
  const { openAuthModal } = useStore();
  const t = useT();

  const learnLinks: FooterLink[] = [
    { labelKey: "footer.allCourses", href: "/courses" },
    { labelKey: "footer.liveClasses", href: "/live-classes" },
    { labelKey: "footer.myDashboard", href: "/dashboard" },
    { labelKey: "footer.myCourses", href: "/my-courses" },
  ];

  const companyLinks: FooterLink[] = [
    { labelKey: "footer.aboutUs", href: "/about" },
    { labelKey: "footer.contact", href: "/contact" },
    { labelKey: "footer.becomeTeacher", href: "/teach" },
    { labelKey: "footer.terms", href: "/terms" },
    { labelKey: "footer.privacyPolicy", href: "/privacy" },
  ];

  return (
    <footer className="mt-auto border-t bg-gradient-to-b from-background to-indigo-50/40">
      {/* Newsletter CTA strip */}
      <div className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-foreground">
              {t("footer.scheduleTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("footer.scheduleDesc")}
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("email");
              if (typeof value !== "string" || !value.trim()) return;
              const email = value.trim();
              try {
                const res = await fetch("/api/newsletter", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, source: "footer" }),
                });
                if (res.ok) {
                  toast.success(t("footer.subscribeSuccess"));
                  (e.target as HTMLFormElement).reset();
                } else {
                  const data = await res.json().catch(() => null);
                  toast.error(data?.error || t("footer.subscribeError"));
                }
              } catch {
                toast.error(t("footer.subscribeError"));
              }
            }}
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Label htmlFor="newsletter-email" className="sr-only">
              {t("footer.emailLabel")}
            </Label>
            <Input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("footer.emailPlaceholder")}
              required
              className="bg-background"
            />
            <Button
              type="submit"
              className="gap-1.5 bg-indigo-700 text-white hover:bg-indigo-800"
            >
              <Send className="h-4 w-4" /> {t("footer.subscribe")}
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              aria-label="SHEEGOW ACADEMY — home"
              className="mb-4 inline-flex"
            >
              <BrandLockup />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("footer.brandDesc")}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Facebook · YouTube · TikTok · Instagram —{" "}
              <span className="font-semibold text-foreground">
                {t("footer.comingSoon")}
              </span>
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              {t("footer.learn")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {learnLinks.map((l) => (
                <li key={l.labelKey}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {t(l.labelKey)}
                    </Link>
                  ) : (
                    <button
                      onClick={() => openAuthModal("register")}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {t(l.labelKey)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              {t("footer.company")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {companyLinks.map((l) => (
                <li key={l.labelKey}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {t(l.labelKey)}
                    </Link>
                  ) : (
                    <button
                      onClick={() => openAuthModal("register")}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {t(l.labelKey)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              {t("footer.getInTouch")}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <a
                  href="mailto:info@sheegowacademy.com"
                  className="hover:text-indigo-600"
                >
                  info@sheegowacademy.com
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <a
                  href="tel:+252634085151"
                  className="hover:text-indigo-600"
                >
                  +252 63 4085151
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <a
                  href="https://wa.me/252634085151"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600"
                >
                  {t("footer.whatsapp")}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>{t("footer.location")}</span>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("footer.supportHours")}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {t("footer.rights")} {new Date().getFullYear()} SHEEGOW ACADEMY. {t("footer.builtWith")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("footer.madeWith")} <span className="text-indigo-700">{t("footer.liveClasses")}</span>, {t("footer.notRecorded")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
