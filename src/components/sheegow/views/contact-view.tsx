"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Video,
  CreditCard,
  CalendarClock,
  Award,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Static data ───────────────────────────────────────── */

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@sheegow.academy",
    href: "mailto:hello@sheegow.academy",
    hint: "We reply within 24 hours",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+252 61 555 0199",
    href: "tel:+252615550199",
    hint: "Sat – Thu, 8AM – 10PM EAT",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Hargeisa, Somaliland",
    href: "#map",
    hint: "Main campus & online classes",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Clock,
    label: "Support Hours",
    value: "Sat – Thu, 8AM – 10PM",
    href: null,
    hint: "East Africa Time (EAT)",
    color: "from-violet-500 to-purple-600",
  },
];

const FAQS = [
  {
    q: "Are the classes really live, or are they recordings?",
    a: "Every SHEEGOW ACADEMY class is a real-time, interactive video session. You join live with your teacher and classmates — you can speak, ask questions in chat, and raise your hand. We never use recorded videos for live classes.",
  },
  {
    q: "How do I pay? Do you accept EVC Plus and Zaad?",
    a: "Yes. We accept EVC Plus, Zaad, and Stripe (for international students). After you click Enroll, you'll be taken to a checkout page where you can choose your payment method. Once payment is confirmed, you're instantly enrolled in the course.",
  },
  {
    q: "What happens if I miss a live class?",
    a: "We encourage attending every live class — that's where the real learning happens. If you must miss one, contact your teacher and they may share notes or schedule a quick catch-up. Live classes are scheduled at multiple times so you can pick what works for you.",
  },
  {
    q: "Do I get a certificate after finishing a course?",
    a: "Yes. When you complete a course (attend the live classes and finish the assignments), you'll receive a SHEEGOW ACADEMY certificate of completion. For IELTS students, the goal is achieving your target Band score on the official exam.",
  },
  {
    q: "Can I try a class before paying?",
    a: "Absolutely. Every new student gets a FREE trial live class — no credit card required. Sign up for a free account, browse our live classes page, and join any upcoming session marked as a trial. You'll experience exactly what a SHEEGOW class feels like.",
  },
];

/* ─── Main view ──────────────────────────────────────────── */

export function ContactView() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.contact({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject,
        message: form.message,
      });
      toast.success("Message sent! We'll get back to you within 24 hours.");
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to send message";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  return (
    <div className="bg-background">
      {/* ─── HEADER ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/60 to-background">
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <MessageSquare className="h-3 w-3" /> Get in Touch
          </Badge>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            We&apos;d love to <span className="gradient-text">hear from you</span>
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Have a question about a course, a live class schedule, or your
            enrollment? Send us a message and our team will respond within 24
            hours.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* ─── LEFT: FORM ──────────────────────────────── */}
          <div>
            <h2 className="mb-2 text-xl font-bold text-foreground">Send a message</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Fill in the form below and we&apos;ll reply by email.
            </p>

            {submitted ? (
              <Card className="border-emerald-200 bg-emerald-50/50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Message sent!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you for reaching out. We&apos;ll respond within 24 hours.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="mt-5"
                >
                  Send another message
                </Button>
              </Card>
            ) : (
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">
                        Full name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Ahmed Hassan"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="+252 61 555 0199"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subject">
                        Subject <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subject"
                        value={form.subject}
                        onChange={update("subject")}
                        placeholder="Question about a course"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message">
                      Message <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={update("message")}
                      placeholder="Tell us how we can help..."
                      rows={5}
                      maxLength={1000}
                      required
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {form.message.length}/1000
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {/* ─── RIGHT: INFO + MAP ───────────────────────── */}
          <div className="space-y-4">
            <h2 className="mb-2 text-xl font-bold text-foreground">Contact info</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Reach us directly using any of the channels below.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_INFO.map((info) => (
                <Card key={info.label} className="card-lift p-5">
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${info.color} text-white shadow-lg`}
                  >
                    <info.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {info.label}
                  </p>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="mt-0.5 block text-sm font-bold text-foreground hover:text-indigo-600"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {info.value}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{info.hint}</p>
                </Card>
              ))}
            </div>

            {/* Map embed */}
            <Card id="map" className="overflow-hidden p-0">
              <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-indigo-100 to-amber-50">
                <iframe
                  title="SHEEGOW ACADEMY location — Hargeisa, Somaliland"
                  src="https://www.google.com/maps?q=Hargeisa,Somaliland&output=embed"
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center gap-2 p-4 text-sm">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-foreground">
                  Hargeisa, Somaliland
                </span>
                <span className="text-muted-foreground">· Online classes worldwide</span>
              </div>
            </Card>
          </div>
        </div>

        <Separator className="my-12" />

        {/* ─── FAQ ──────────────────────────────────────── */}
        <section>
          <div className="mb-10 text-center">
            <Badge
              variant="outline"
              className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
            >
              <HelpCircle className="h-3 w-3" /> FAQ
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Quick answers to the questions we hear most from new students.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Card className="p-6 sm:p-8">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>

            {/* Quick topic chips */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Video, label: "Live Classes" },
                { icon: CreditCard, label: "Payments (EVC Plus / Zaad)" },
                { icon: CalendarClock, label: "Class Scheduling" },
                { icon: Award, label: "Certificates" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border bg-card p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Still need help CTA */}
            <div className="mt-8 rounded-2xl border bg-gradient-to-r from-indigo-50 to-amber-50/50 p-6 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">
                Still need help?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fill out the form above and we&apos;ll get back to you within 24
                hours.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
