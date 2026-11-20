"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  CreditCard,
  Smartphone,
  Wallet,
  Check,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Tag,
  Lock,
  CheckCircle2,
  Loader2,
  LogIn,
  XCircle,
  Video,
  Award,
  MessageSquare,
  Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, levelBadgeClass } from "@/lib/ui";

type PaymentMethod = "card" | "zaad" | "edahab";

const METHODS: {
  id: PaymentMethod;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: "card",
    name: "Card",
    desc: "Visa, Mastercard, Amex — instant enrollment",
    icon: CreditCard,
    accent: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "zaad",
    name: "Zaad Service",
    desc: "Pay with TELESOM Zaad mobile wallet",
    icon: Wallet,
    accent: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "edahab",
    name: "Edahab (E-Dahab)",
    desc: "Pay with E-Dahab mobile wallet",
    icon: Smartphone,
    accent: "bg-amber-100 text-amber-600",
  },
];

const INCLUDED = [
  { icon: Video, label: "Live video classes" },
  { icon: Award, label: "Certificate of completion" },
  { icon: MessageSquare, label: "Real-time chat support" },
  { icon: InfinityIcon, label: "Lifetime access" },
];

export function CheckoutView() {
  const {
    user,
    authLoading,
    openAuthModal,
    navigate,
    checkoutCourseId,
  } = useStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod | "">("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Mobile wallet phone
  const [phone, setPhone] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!checkoutCourseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .course(checkoutCourseId)
      .then((r) => setCourse(r.course))
      .catch(() => {
        setCourse(null);
        toast.error("Could not load course details");
      })
      .finally(() => setLoading(false));
  }, [checkoutCourseId]);

  const pricing = useMemo(() => {
    if (!course)
      return { original: 0, discount: 0, total: 0, hasCoupon: false };
    const original = course.price;
    const discount = coupon
      ? Math.round(original * (coupon.discount / 100) * 100) / 100
      : 0;
    const total = Math.max(0, Math.round((original - discount) * 100) / 100);
    return { original, discount, total, hasCoupon: !!coupon };
  }, [course, coupon]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <LogIn className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Please log in</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Log in to your account to complete payment and enroll.
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
          >
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  if (!checkoutCourseId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <Tag className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">No course selected</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Choose a course to start the checkout process.
          </p>
          <Button
            onClick={() => navigate("courses")}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Button>
        </Card>
      </div>
    );
  }

  // ─── Validation helpers ──────────────────────────────────────────
  const validate = (): string | null => {
    if (!method) return "Please select a payment method";
    if (method === "card") {
      const digits = cardNumber.replace(/\s+/g, "");
      if (digits.length < 16) return "Enter a valid 16-digit card number";
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry))
        return "Enter a valid expiry date (MM/YY)";
      if (cardCvc.length < 3) return "Enter a valid CVC";
    } else {
      if (!phone.trim() || phone.replace(/\D/g, "").length < 7)
        return "Enter a valid phone number";
    }
    return null;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    if (!course) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.validateCoupon({
        code: couponCode.trim(),
        courseId: course.id,
      });
      if (res.valid && typeof res.discount === "number") {
        setCoupon({ code: couponCode.trim(), discount: res.discount });
        toast.success(
          `Coupon applied — ${res.discount}% off`
        );
      } else {
        setCoupon(null);
        setCouponError("Coupon is invalid or expired");
        toast.error("Coupon is invalid or expired");
      }
    } catch (err) {
      setCoupon(null);
      const msg =
        err instanceof ApiError ? err.message : "Could not validate coupon";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      await api.checkout({
        courseId: course!.id,
        method: method as PaymentMethod,
        couponCode: coupon?.code,
      });
      toast.success("Payment successful! You're enrolled.");
      navigate("my-courses");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Payment failed. Try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("courses")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Checkout
        </h1>
        <div className="w-16" />
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : !course ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This course could not be loaded.
          </p>
          <Button
            onClick={() => navigate("courses")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700"
          >
            Browse courses
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ─── Left: payment form ──────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Payment methods */}
            <Card className="p-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Payment Method</CardTitle>
                <CardDescription>
                  Choose how you want to pay for this course.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as PaymentMethod)}
                  className="grid gap-3"
                >
                  {METHODS.map((m) => {
                    const selected = method === m.id;
                    return (
                      <label
                        key={m.id}
                        htmlFor={`m-${m.id}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                          selected
                            ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                        }`}
                      >
                        <RadioGroupItem
                          id={`m-${m.id}`}
                          value={m.id}
                          className="sr-only"
                        />
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${m.accent}`}
                        >
                          <m.icon className="h-5 w-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                            {m.name}
                            {selected && (
                              <Check className="h-4 w-4 text-indigo-600" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.desc}
                          </p>
                        </div>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Method-specific fields */}
            {method === "card" && (
              <Card className="p-0">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    Card Details
                  </CardTitle>
                  <CardDescription>
                    Your payment is encrypted and secure (demo — do not enter
                    real card data).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="cardNumber"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 16);
                          const formatted = digits.replace(
                            /(.{4})/g,
                            "$1 "
                          ).trim();
                          setCardNumber(formatted);
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cardExpiry">Expiry (MM/YY)</Label>
                      <Input
                        id="cardExpiry"
                        inputMode="numeric"
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (v.length >= 3)
                            v = v.slice(0, 2) + "/" + v.slice(2);
                          setCardExpiry(v);
                        }}
                        placeholder="12/27"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cardCvc">CVC</Label>
                      <Input
                        id="cardCvc"
                        inputMode="numeric"
                        value={cardCvc}
                        onChange={(e) =>
                          setCardCvc(
                            e.target.value.replace(/\D/g, "").slice(0, 4)
                          )
                        }
                        placeholder="123"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(method === "zaad" || method === "edahab") && (
              <Card className="p-0">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    {method === "zaad" ? "Zaad Service Phone" : "Edahab Phone"}
                  </CardTitle>
                  <CardDescription>
                    Enter the mobile number registered with your{" "}
                    {method === "zaad" ? "Zaad Service" : "Edahab (E-Dahab)"} wallet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="walletPhone">Phone Number</Label>
                    <Input
                      id="walletPhone"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+252 63 4085151"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      You will receive a payment prompt on this number (demo —
                      no real charge).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Coupon */}
            <Card className="p-0">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-amber-600" />
                  Coupon Code
                </CardTitle>
                <CardDescription>
                  Have a discount code? Apply it here.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {coupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">
                          {coupon.code} applied
                        </p>
                        <p className="text-xs text-emerald-700">
                          {coupon.discount}% discount
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCoupon(null);
                        setCouponCode("");
                      }}
                      className="text-emerald-700 hover:bg-emerald-100"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError("");
                      }}
                      placeholder="SHEEGOW10"
                      className="uppercase"
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      variant="outline"
                      className="shrink-0 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {couponLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Tag className="h-4 w-4" />
                      )}
                      Apply
                    </Button>
                  </div>
                )}
                {couponError && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <XCircle className="h-3.5 w-3.5" />
                    {couponError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Instant enrollment
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                Lifetime access
              </span>
            </div>
          </div>

          {/* ─── Right: order summary ─────────────────────── */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 p-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex gap-3">
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                    {course.image ? (
                      <img loading="lazy" decoding="async"
                        src={course.image}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
                        <CreditCard className="h-6 w-6 text-indigo-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge
                      variant="outline"
                      className={`mb-1 border ${levelBadgeClass(course.level)}`}
                    >
                      {course.level}
                    </Badge>
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                      {course.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration} weeks
                  </span>
                  <span>Live classes included</span>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original</span>
                    <span className="font-medium">
                      {formatPrice(pricing.original)}
                    </span>
                  </div>
                  {pricing.hasCoupon && (
                    <div className="flex justify-between text-emerald-700">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Discount ({coupon?.discount}%)
                      </span>
                      <span className="font-semibold">
                        -{formatPrice(pricing.discount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="text-xl font-extrabold text-indigo-700">
                      {formatPrice(pricing.total)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Complete Payment
                </Button>

                <Separator />

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What&apos;s included
                  </p>
                  <ul className="space-y-2">
                    {INCLUDED.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <item.icon className="h-3 w-3" />
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
