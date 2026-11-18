"use client";

import { useStore } from "@/lib/store";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Footer() {
  const { navigate } = useStore();

  return (
    <footer className="mt-auto border-t bg-gradient-to-b from-background to-indigo-50/40">
      {/* Newsletter CTA strip */}
      <div className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-foreground">
              Get a FREE trial English class
            </h3>
            <p className="text-sm text-muted-foreground">
              Join our newsletter and never miss a live class schedule.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Subscribed! Check your inbox for the trial link.");
              (e.target as HTMLFormElement).reset();
            }}
            className="flex w-full max-w-md items-center gap-2"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              required
              className="bg-background"
            />
            <Button type="submit" className="gap-1.5">
              <Send className="h-4 w-4" /> Subscribe
            </Button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <button
              onClick={() => navigate("home")}
              className="mb-4 flex items-center gap-2.5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                <GraduationCap className="h-6 w-6" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-lg font-extrabold tracking-tight">
                  SHEEGOW
                </span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-indigo-500">
                  ACADEMY
                </span>
              </span>
            </button>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Live English learning platform built for Somali-speaking students
              worldwide. Learn with expert teachers in real-time interactive
              classes.
            </p>
            <div className="mt-4 flex gap-2">
              {[
                { Icon: Facebook, label: "Facebook" },
                { Icon: Twitter, label: "Twitter" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  onClick={(e) => e.preventDefault()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
              Learn
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "All Courses", view: "courses" as const },
                { label: "Live Classes", view: "live" as const },
                { label: "My Dashboard", view: "dashboard" as const },
                { label: "My Courses", view: "my-courses" as const },
              ].map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.view)}
                    className="text-muted-foreground transition-colors hover:text-indigo-600"
                  >
                    {l.label}
                  </button>
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
              {[
                { label: "About Us", view: "about" as const },
                { label: "Contact", view: "contact" as const },
                { label: "Become a Teacher", view: "register" as const },
                { label: "Terms & Privacy", view: "about" as const },
              ].map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.view)}
                    className="text-muted-foreground transition-colors hover:text-indigo-600"
                  >
                    {l.label}
                  </button>
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
                  href="mailto:hello@sheegow.academy"
                  className="hover:text-indigo-600"
                >
                  hello@sheegow.academy
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>+252 61 555 0199</span>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>Mogadishu, Somalia</span>
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
            Built with care for Somali learners.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with <span className="text-indigo-500">live classes</span>, not
            recorded videos.
          </p>
        </div>
      </div>
    </footer>
  );
}
