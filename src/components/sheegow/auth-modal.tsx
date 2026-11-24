"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { isValidSomaliPhone } from "@/lib/phone";
import { PhoneInput } from "./phone-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, X } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { toast } from "sonner";

export function AuthModal() {
  const { authModal, closeAuthModal, openAuthModal, setUser } = useStore();
  const router = useRouter();
  const isLogin = authModal === "login";
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  // Login accepts one identifier: username, email or Somali phone number.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // Register fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);

  const passwordScore = scorePassword(password);

  /** Read the `?ref=CODE` query param from the current URL. Returns an empty
   *  string when no referral code is present (the common case). */
  function readRefParam(): string {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("ref") ?? "";
    } catch {
      return "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { user } = await api.login({ identifier, password });
        setUser(user);
        toast.success(`Welcome back, ${user.fullName.split(" ")[0]}!`);
        closeAuthModal();
        resetForm();
        // All roles (student, teacher, admin) land on the unified dashboard.
        router.push("/dashboard");
      } else {
        if (!agree) {
          toast.error("Please accept the terms to continue.");
          setLoading(false);
          return;
        }
        if (!isValidSomaliPhone(phone)) {
          toast.error("Enter a Somali number starting with 61, 63 or 65.");
          setLoading(false);
          return;
        }
        const { user } = await api.register({
          fullName,
          email,
          username: username || undefined,
          phone,
          password,
          // Forward the `?ref=CODE` referral param (if present in the URL) so
          // the server can auto-link the referral + create the discount coupon.
          ref: readRefParam(),
        });
        setUser(user);
        toast.success("Account created! Welcome to SHEEGOW ACADEMY.");
        closeAuthModal();
        resetForm();
        router.push("/dashboard");
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setIdentifier("");
    setEmail("");
    setPassword("");
    setFullName("");
    setUsername("");
    setPhone("");
    setAgree(false);
    setShowPassword(false);
  }

  return (
    <Dialog
      open={authModal !== null}
      onOpenChange={(open) => {
        if (!open) {
          closeAuthModal();
          resetForm();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-md overflow-hidden p-0" showCloseButton={false}>
        {/* Header banner */}
        <div className="relative shrink-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 px-6 py-7 text-white">
          <div className="hero-mesh absolute inset-0 opacity-60" />
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <BrandMark className="h-7 w-auto" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight">
                {isLogin ? "Welcome Back" : "Join SHEEGOW ACADEMY"}
              </p>
              <p className="text-xs text-indigo-200">
                {isLogin
                  ? "Log in to continue learning English"
                  : "Start learning English with LIVE classes today"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(92vh-7rem)] overflow-y-auto px-6 pb-6 pt-5">
          <DialogHeader className="mb-4 space-y-1">
            <DialogTitle className="text-xl">
              {isLogin ? "Log in to your account" : "Create your account"}
            </DialogTitle>
            <DialogDescription>
              {isLogin
                ? "Enter your username, email or phone number and password."
                : "Fill in your details to get started with live English classes."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ahmed Hassan"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username (optional)</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ahmed.hassan"
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  3–30 small letters, numbers, dots or underscores. Leave blank
                  and we will create one for you.
                </p>
              </div>
            )}

            {isLogin ? (
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Username, Email or Phone</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ahmed.hassan / you@example.com / 634085151"
                    autoComplete="username"
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the username, email or phone number linked to your account.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneInput id="phone" value={phone} onChange={setPhone} required />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  required
                  minLength={isLogin ? undefined : 12}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!isLogin && password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-1.5 flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          passwordScore >= i
                            ? passwordScore <= 1
                              ? "bg-red-500"
                              : passwordScore <= 2
                                ? "bg-amber-500"
                                : passwordScore <= 3
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {["Weak", "Fair", "Good", "Strong"][passwordScore - 1] ||
                      "Weak"}
                  </span>
                </div>
              )}
            </div>

            {isLogin ? (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(!!v)}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:underline"
                  onClick={() => toast.info("Password reset link sent (demo).")}
                >
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={agree}
                  onCheckedChange={(v) => setAgree(!!v)}
                  className="mt-0.5"
                />
                <span className="text-muted-foreground">
                  I agree to the{" "}
                  <span className="font-medium text-indigo-600">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-indigo-600">
                    Privacy Policy
                  </span>
                </span>
              </label>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => openAuthModal(isLogin ? "register" : "login")}
              className="font-semibold text-indigo-600 hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>

        </div>
      </DialogContent>
    </Dialog>
  );
}

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
