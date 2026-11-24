"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import type {
  EnglishLevel,
  TeacherApplication,
  TeacherApplicationStatus,
  TeachingExperience,
} from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/ui";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle2,
  Globe,
  Loader2,
  LogIn,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Languages,
  Briefcase,
  User as UserIcon,
  Heart,
  Wifi,
  Video,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Static option lists ──────────────────────────────── */

const ENGLISH_LEVELS: EnglishLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Native",
];

const EXPERIENCE_BUCKETS: { value: TeachingExperience; labelKey: string }[] = [
  { value: "0", labelKey: "teach.experienceNone" },
  { value: "1-3", labelKey: "teach.experience1to3" },
  { value: "3-5", labelKey: "teach.experience3to5" },
  { value: "5-10", labelKey: "teach.experience5to10" },
  { value: "10+", labelKey: "teach.experience10plus" },
];

const AVAILABILITY_OPTIONS = [
  "teach.availabilityWeekdayMornings",
  "teach.availabilityWeekdayAfternoons",
  "teach.availabilityWeekdayEvenings",
  "teach.availabilityWeekendMornings",
  "teach.availabilityWeekendEvenings",
  "teach.availabilityFlexible",
];

const BENEFITS = [
  {
    icon: Clock,
    titleKey: "teach.benefitFlexibleTitle",
    descKey: "teach.benefitFlexibleDesc",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: DollarSign,
    titleKey: "teach.benefitEarnTitle",
    descKey: "teach.benefitEarnDesc",
    color: "from-amber-500 to-amber-600",
  },
  {
    icon: Users,
    titleKey: "teach.benefitReachTitle",
    descKey: "teach.benefitReachDesc",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Sparkles,
    titleKey: "teach.benefitCommunityTitle",
    descKey: "teach.benefitCommunityDesc",
    color: "from-fuchsia-500 to-fuchsia-600",
  },
];

const REQUIREMENTS = [
  { icon: Languages, key: "teach.reqFluent" },
  { icon: Briefcase, key: "teach.reqExperience" },
  { icon: Heart, key: "teach.reqPassion" },
  { icon: Wifi, key: "teach.reqInternet" },
  { icon: Video, key: "teach.reqAvailable" },
];

const MAX_BIO = 2000;

/* ─── Form state ───────────────────────────────────────── */

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  nativeLanguage: string;
  englishLevel: EnglishLevel | "";
  teachingExperience: TeachingExperience | "";
  certifications: string;
  bio: string;
  teachingPhilosophy: string;
  sampleLesson: string;
  linkedinUrl: string;
  resumeUrl: string;
  preferredCourses: string;
  availability: string;
  consent: boolean;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  nativeLanguage: "",
  englishLevel: "",
  teachingExperience: "",
  certifications: "",
  bio: "",
  teachingPhilosophy: "",
  sampleLesson: "",
  linkedinUrl: "",
  resumeUrl: "",
  preferredCourses: "",
  availability: "",
  consent: false,
};

/* ─── Status helpers ───────────────────────────────────── */

function statusBadge(status: TeacherApplicationStatus, t: (k: string) => string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> {t("teach.statusApproved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="gap-1 border-rose-200 bg-rose-50 text-rose-700">
          <XCircle className="h-3 w-3" /> {t("teach.statusRejected")}
        </Badge>
      );
    case "under_review":
      return (
        <Badge className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700">
          <Loader2 className="h-3 w-3 animate-spin" />{" "}
          {t("teach.statusUnderReview")}
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
          <Clock className="h-3 w-3" /> {t("teach.statusPending")}
        </Badge>
      );
  }
}

/* ─── Status tracker ───────────────────────────────────── */

function StatusTracker({
  application,
  onReset,
  t,
}: {
  application: TeacherApplication;
  onReset: () => void;
  t: (k: string) => string;
}) {
  const step1Done = true;
  const step2Done =
    application.status === "under_review" ||
    application.status === "approved" ||
    application.status === "rejected";
  const step3Done =
    application.status === "approved" || application.status === "rejected";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-indigo-50/60 to-amber-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{t("teach.trackerTitle")}</CardTitle>
            <CardDescription className="mt-1">
              {t("teach.trackerDesc")}
            </CardDescription>
          </div>
          {statusBadge(application.status, t)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Timeline */}
        <ol className="relative space-y-6 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border sm:before:left-5">
          <TimelineStep
            done={step1Done}
            active={!step2Done}
            title={t("teach.stepSubmitted")}
            meta={`${t("teach.appliedOn")} ${formatDate(application.createdAt)}`}
            icon={CheckCircle2}
          />
          <TimelineStep
            done={step2Done}
            active={application.status === "under_review"}
            title={t("teach.stepReview")}
            meta={
              application.status === "under_review"
                ? t("teach.statusUnderReview")
                : step2Done
                ? t("teach.statusUnderReview")
                : null
            }
            icon={Loader2}
          />
          <TimelineStep
            done={step3Done}
            active={step3Done}
            title={t("teach.stepDecision")}
            meta={
              application.status === "approved"
                ? t("teach.statusApproved")
                : application.status === "rejected"
                ? t("teach.statusRejected")
                : null
            }
            icon={
              application.status === "rejected"
                ? XCircle
                : CheckCircle2
            }
          />
        </ol>

        {/* Outcome message */}
        {application.status === "approved" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {t("teach.statusApproved")}
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {t("teach.approvedWelcome")}
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {t("teach.goDashboard")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {application.status === "rejected" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-900">
                  {t("teach.statusRejected")}
                </p>
                <p className="mt-1 text-sm text-rose-800">
                  {t("teach.rejectedMsg")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="mt-3 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("teach.submitAnother")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin note */}
        {application.adminNote && (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("teach.adminNoteLabel")}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {application.adminNote}
            </p>
            {application.reviewedAt && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("teach.reviewedOn")} {formatDateTime(application.reviewedAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineStep({
  done,
  active,
  title,
  meta,
  icon: Icon,
}: {
  done: boolean;
  active: boolean;
  title: string;
  meta: string | null;
  icon: typeof CheckCircle2;
}) {
  return (
    <li className="relative flex items-start gap-3 sm:gap-4 sm:pl-2">
      <span
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background sm:h-10 sm:w-10",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
            ? "border-indigo-500 text-indigo-600"
            : "border-border text-muted-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 sm:h-5 sm:w-5",
            active && !done && "animate-spin"
          )}
        />
      </span>
      <div className="pt-1.5">
        <p
          className={cn(
            "text-sm font-semibold",
            done ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
    </li>
  );
}

/* ─── Application form ─────────────────────────────────── */

function ApplicationForm({
  initialForm,
  onSubmit,
  submitting,
  t,
}: {
  initialForm: FormState;
  onSubmit: (form: FormState) => void;
  submitting: boolean;
  t: (k: string) => string;
}) {
  const [form, setForm] = useState<FormState>(initialForm);

  // Controlled text field helper
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const bioLen = form.bio.length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <UserIcon className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionPersonal")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("teach.fullName")} htmlFor="ta-fullName" required>
            <Input
              id="ta-fullName"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder={t("teach.fullNamePlaceholder")}
              required
              maxLength={120}
            />
          </Field>
          <Field label={t("teach.email")} htmlFor="ta-email" required>
            <Input
              id="ta-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder={t("teach.emailPlaceholder")}
              required
              maxLength={160}
            />
          </Field>
          <Field label={t("teach.phone")} htmlFor="ta-phone" required>
            <Input
              id="ta-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder={t("teach.phonePlaceholder")}
              required
              maxLength={40}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("teach.city")} htmlFor="ta-city" required>
              <Input
                id="ta-city"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder={t("teach.cityPlaceholder")}
                required
                maxLength={120}
              />
            </Field>
            <Field label={t("teach.country")} htmlFor="ta-country" required>
              <Input
                id="ta-country"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder={t("teach.countryPlaceholder")}
                required
                maxLength={120}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Languages className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionLanguage")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("teach.nativeLanguage")}
            htmlFor="ta-nativeLanguage"
            required
          >
            <Input
              id="ta-nativeLanguage"
              value={form.nativeLanguage}
              onChange={(e) => setField("nativeLanguage", e.target.value)}
              placeholder={t("teach.nativeLanguagePlaceholder")}
              required
              maxLength={80}
            />
          </Field>
          <Field
            label={t("teach.englishLevel")}
            htmlFor="ta-englishLevel"
            required
          >
            <Select
              value={form.englishLevel}
              onValueChange={(v) => setField("englishLevel", v as EnglishLevel)}
            >
              <SelectTrigger id="ta-englishLevel">
                <SelectValue placeholder={t("teach.englishLevelPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {ENGLISH_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionExperience")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("teach.teachingExperience")}
            htmlFor="ta-experience"
            required
          >
            <Select
              value={form.teachingExperience}
              onValueChange={(v) =>
                setField("teachingExperience", v as TeachingExperience)
              }
            >
              <SelectTrigger id="ta-experience">
                <SelectValue
                  placeholder={t("teach.teachingExperiencePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_BUCKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {t(b.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t("teach.certifications")}
            htmlFor="ta-certifications"
          >
            <Input
              id="ta-certifications"
              value={form.certifications}
              onChange={(e) => setField("certifications", e.target.value)}
              placeholder={t("teach.certificationsPlaceholder")}
              maxLength={300}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionAbout")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t("teach.bio")} htmlFor="ta-bio" required>
            <Textarea
              id="ta-bio"
              value={form.bio}
              onChange={(e) =>
                e.target.value.length <= MAX_BIO &&
                setField("bio", e.target.value)
              }
              placeholder={t("teach.bioPlaceholder")}
              required
              rows={5}
              maxLength={MAX_BIO}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {bioLen}/{MAX_BIO} · {t("teach.bioHelp")}
            </p>
          </Field>
          <Field
            label={t("teach.teachingPhilosophy")}
            htmlFor="ta-philosophy"
          >
            <Textarea
              id="ta-philosophy"
              value={form.teachingPhilosophy}
              onChange={(e) => setField("teachingPhilosophy", e.target.value)}
              placeholder={t("teach.teachingPhilosophyPlaceholder")}
              rows={4}
              maxLength={2000}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionPortfolio")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label={t("teach.sampleLesson")}
            htmlFor="ta-sampleLesson"
          >
            <Input
              id="ta-sampleLesson"
              type="url"
              value={form.sampleLesson}
              onChange={(e) => setField("sampleLesson", e.target.value)}
              placeholder={t("teach.sampleLessonPlaceholder")}
              maxLength={500}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("teach.linkedinUrl")}
              htmlFor="ta-linkedin"
            >
              <Input
                id="ta-linkedin"
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => setField("linkedinUrl", e.target.value)}
                placeholder={t("teach.linkedinUrlPlaceholder")}
                maxLength={500}
              />
            </Field>
            <Field
              label={t("teach.resumeUrl")}
              htmlFor="ta-resume"
            >
              <Input
                id="ta-resume"
                type="url"
                value={form.resumeUrl}
                onChange={(e) => setField("resumeUrl", e.target.value)}
                placeholder={t("teach.resumeUrlPlaceholder")}
                maxLength={500}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionPreferences")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label={t("teach.preferredCourses")}
            htmlFor="ta-preferred"
          >
            <Textarea
              id="ta-preferred"
              value={form.preferredCourses}
              onChange={(e) => setField("preferredCourses", e.target.value)}
              placeholder={t("teach.preferredCoursesPlaceholder")}
              rows={3}
              maxLength={2000}
            />
          </Field>
          <Field
            label={t("teach.availability")}
            htmlFor="ta-availability"
            required
          >
            <Select
              value={form.availability}
              onValueChange={(v) => setField("availability", v)}
            >
              <SelectTrigger id="ta-availability">
                <SelectValue placeholder={t("teach.availabilityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">
                {t("teach.sectionConsent")}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <label
            htmlFor="ta-consent"
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
          >
            <Checkbox
              id="ta-consent"
              checked={form.consent}
              onCheckedChange={(v) => setField("consent", v === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-foreground">
              {t("teach.consentLabel")}
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? t("teach.submitting") : t("teach.submit")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* ─── Main view ────────────────────────────────────────── */

export function TeachView() {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<TeacherApplication | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.teacherApplications();
      // Pick the most recent (the API already sorts desc, but be defensive).
      const latest =
        res.applications.length > 0 ? res.applications[0] : null;
      setExisting(latest);
      // Only show the form when the latest application is rejected (allow
      // re-applying). Pending / under_review / approved show the tracker.
      setShowForm(latest?.status === "rejected");
    } catch (err) {
      // A 401 here is expected when logged out — handled by the auth gate.
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Failed to load your application"
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [user, load]);

  /* ─── Loading ─── */
  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  /* ─── Logged out ─── */
  if (!user) {
    return (
      <>
        <Hero t={t} showCta={false} />
        <section className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              <LogIn className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold">
              {t("teach.mustLoginTitle")}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("teach.mustLoginDesc")}
            </p>
            <Button
              onClick={() => openAuthModal("login")}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
            >
              <LogIn className="h-4 w-4" />
              {t("nav.login")}
            </Button>
          </Card>
        </section>
        <Requirements t={t} />
        <Benefits t={t} />
      </>
    );
  }

  /* ─── Already a teacher or admin ─── */
  const isTeachingStaff =
    user.role === "teacher" ||
    user.role === "admin" ||
    user.role === "super_admin";
  if (isTeachingStaff && !existing) {
    return (
      <>
        <Hero t={t} showCta={false} />
        <section className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <GraduationCap className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold">
              {t("teach.alreadyTeacherTitle")}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("teach.alreadyTeacherDesc")}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition-colors hover:from-indigo-600 hover:to-indigo-700"
            >
              {t("teach.goDashboard")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
        <Requirements t={t} />
        <Benefits t={t} />
      </>
    );
  }

  /* ─── Status tracker (active application) ─── */
  if (existing && !showForm) {
    return (
      <>
        <Hero t={t} showCta={false} />
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <StatusTracker
            application={existing}
            onReset={() => {
              setShowForm(true);
            }}
            t={t}
          />
        </section>
        <Benefits t={t} />
      </>
    );
  }

  /* ─── Application form ─── */
  const initialForm: FormState = {
    ...EMPTY_FORM,
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
  };

  async function handleSubmit(form: FormState) {
    setSubmitting(true);
    try {
      await api.createTeacherApplication({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        nativeLanguage: form.nativeLanguage.trim(),
        englishLevel: form.englishLevel as EnglishLevel,
        teachingExperience: form.teachingExperience as TeachingExperience,
        certifications: form.certifications.trim() || undefined,
        bio: form.bio.trim(),
        teachingPhilosophy: form.teachingPhilosophy.trim() || undefined,
        sampleLesson: form.sampleLesson.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        resumeUrl: form.resumeUrl.trim() || undefined,
        preferredCourses: form.preferredCourses.trim() || undefined,
        availability: form.availability,
        consent: form.consent,
      });
      toast.success(t("teach.submitSuccessTitle"), {
        description: t("teach.submitSuccessDesc"),
      });
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to submit your application"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Hero t={t} showCta={false} />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("teach.formTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t("teach.formDesc")}
          </p>
        </div>

        <ApplicationForm
          initialForm={initialForm}
          onSubmit={handleSubmit}
          submitting={submitting}
          t={t}
        />
      </section>

      <Benefits t={t} />
    </>
  );
}

/* ─── Hero ─────────────────────────────────────────────── */

function Hero({
  t,
  showCta,
}: {
  t: (k: string) => string;
  showCta: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/70 to-background">
      <div className="hero-mesh absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            {t("teach.eyebrow")}
          </p>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t("teach.heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("teach.heroLead")}
          </p>
          {showCta && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#apply"
                className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-700"
              >
                {t("teach.heroCta")}
              </a>
              <a
                href="#requirements"
                className="inline-flex min-h-11 items-center rounded-xl border border-indigo-300 bg-background px-6 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                {t("teach.heroCtaSecondary")}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Benefits ─────────────────────────────────────────── */

function Benefits({ t }: { t: (k: string) => string }) {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("teach.benefitsTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <Card
              key={b.titleKey}
              className="card-lift flex flex-col items-start p-6"
            >
              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                  b.color
                )}
              >
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-foreground">
                {t(b.titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(b.descKey)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Requirements ─────────────────────────────────────── */

function Requirements({ t }: { t: (k: string) => string }) {
  return (
    <section
      id="requirements"
      className="border-t"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("teach.requirementsTitle")}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {t("teach.requirementsDesc")}
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REQUIREMENTS.map((r) => (
            <li
              key={r.key}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed text-foreground"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <r.icon className="h-4 w-4" />
              </span>
              <span className="pt-1.5 font-medium">{t(r.key)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
