"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, type View } from "@/lib/store";
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
  label: string;
  href?: string;
  view?: View;
};

export function Footer() {
  const { openAuthModal } = useStore();
  const router = useRouter();

  /** Interactive-only views get an addressable URL on the app root. */
  const goApp = (view: View) => {
    router.push(view === "home" ? "/" : `/?view=${view}`);
  };

  return (
    <footer className="mt-auto border-t bg-gradient-to-b from-background to-indigo-50/40">
      {/* Newsletter CTA strip */}
      <div className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-foreground">
              Get the live class schedule
            </h3>
            <p className="text-sm text-muted-foreground">
              Send us your email and we will add you to the class schedule list.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("email");
              if (typeof value !== "string" || !value.trim()) return;
              const subject = encodeURIComponent(
                "Live class schedule — please add my email"
              );
              const body = encodeURIComponent(
                `Hello SHEEGOW ACADEMY,\n\nPlease add ${value.trim()} to the live class schedule list.\n\nThank you.`
              );
              window.location.href = `mailto:info@sheegowacademy.com?subject=${subject}&body=${body}`;
              toast.info(
                "Your email app will open — send the message to join the list."
              );
            }}
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Label htmlFor="newsletter-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              required
              className="bg-background"
            />
            <Button
              type="submit"
              className="gap-1.5 bg-indigo-700 text-white hover:bg-indigo-800"
            >
              <Send className="h-4 w-4" /> Request schedule
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
              Live English learning platform for students everywhere. Learn with
              expert teachers in real-time interactive classes.
            </p>
            {/* No real profiles exist yet — never render fake '#' links. */}
            <p className="mt-4 text-xs text-muted-foreground">
              Facebook · YouTube · TikTok · Instagram —{" "}
              <span className="font-semibold text-foreground">Coming soon</span>
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              Learn
            </h4>
            <ul className="space-y-2.5 text-sm">
              {([
                { label: "All Courses", href: "/courses" },
                { label: "Live Classes", href: "/live-classes" },
                { label: "My Dashboard", view: "dashboard" as const },
                { label: "My Courses", view: "my-courses" as const },
              ] as FooterLink[]).map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => l.view && goApp(l.view)}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              {([
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Become a Teacher" },
                { label: "Terms", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
              ] as FooterLink[]).map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => openAuthModal("register")}
                      className="text-muted-foreground transition-colors hover:text-indigo-600"
                    >
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              Get in Touch
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
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <a
                  href="https://wa.me/252634085151"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-600"
                >
                  Chat on WhatsApp
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>Hargeisa, Somaliland</span>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Support hours: Sat – Thu, 8AM – 10PM EAT
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SHEEGOW ACADEMY. All rights reserved.
            Built with care for learners everywhere.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with <span className="text-indigo-700">live classes</span>, not
            recorded videos.
          </p>
        </div>
      </div>
    </footer>
  );
}
