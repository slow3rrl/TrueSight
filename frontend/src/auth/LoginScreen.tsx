import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Lock, Mail, School, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../context/auth-types";

type FormErrors = {
  email?: string;
  password?: string;
  role?: string;
  general?: string;
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = isSubmitting || loading;

  const validationErrors = useMemo<FormErrors>(() => {
    const next: FormErrors = {};

    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      next.email = "Please enter a valid email address.";
    }

    if (!password.trim()) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    return next;
  }, [email, password]);

  useEffect(() => {
    setErrors((current) => ({
      ...current,
      email: touched.email ? validationErrors.email : current.email,
      password: touched.password ? validationErrors.password : current.password,
    }));
  }, [touched, validationErrors]);

  useEffect(() => {
    if (!user) return;

    if (user.role !== role) {
      setErrors({
        role: `This account is registered as ${user.role}, not ${role}.`,
      });
      return;
    }

    if (user.role === "teacher") {
      navigate("/teacher/teacher_screen/home", { replace: true });
      return;
    }

    navigate("/student/student_screen", { replace: true });
  }, [user, role, navigate]);

  const handleLogin = async () => {
    const nextErrors: FormErrors = { ...validationErrors };
    setTouched({ email: true, password: true });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
      toast.success("Welcome back.");
    } catch (error) {
      setErrors({ general: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-[var(--app-text)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--app-accent)_20%,transparent)] blur-3xl" />
        <div className="absolute bottom-[-130px] right-[-80px] h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--app-accent-2)_20%,transparent)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="theme-surface w-full max-w-md rounded-3xl p-6 sm:p-7">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))] text-xl font-bold text-white shadow-[var(--app-shadow)]">
              AI
            </div>
            <h1 className="theme-title text-3xl font-extrabold">TrueSight</h1>
            <p className="mt-2 text-sm theme-muted">
              Sign in to access classes, submissions, and AI analysis.
            </p>
          </div>

          <div className="mb-5">
            <div className="relative flex rounded-2xl border theme-border p-1 bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)]">
              <div
                className={[
                  "absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-xl bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))]",
                  "transition-transform duration-300",
                  role === "student" ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setErrors((current) => ({ ...current, role: undefined }));
                }}
                className={[
                  "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold",
                  role === "student" ? "text-white" : "text-[var(--app-muted)]",
                ].join(" ")}
              >
                <School className="h-4 w-4" />
                Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("teacher");
                  setErrors((current) => ({ ...current, role: undefined }));
                }}
                className={[
                  "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold",
                  role === "teacher" ? "text-white" : "text-[var(--app-muted)]",
                ].join(" ")}
              >
                <School className="h-4 w-4" />
                Teacher
              </button>
            </div>
            {errors.role && <p className="mt-2 text-sm text-rose-400">{errors.role}</p>}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((current) => ({ ...current, general: undefined }));
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  placeholder="name@email.com"
                  className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/80"
                />
              </div>
              {touched.email && validationErrors.email && (
                <p className="mt-1.5 text-xs text-rose-400">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, general: undefined }));
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  placeholder="Enter your password"
                  className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/80"
                />
              </div>
              {touched.password && validationErrors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{validationErrors.password}</p>
              )}
            </div>

            {errors.general && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {errors.general}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={isBusy}
              className="theme-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:translate-y-[-1px] hover:shadow-[var(--app-shadow)] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Login
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/auth/signup_screen")}
            className="pl-17 mt-5 text-sm theme-muted transition hover:text-[var(--app-accent)]"
          >
            Don&apos;t have an account?{" "}
            <span className="font-semibold text-[var(--app-accent)]">Sign up here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
