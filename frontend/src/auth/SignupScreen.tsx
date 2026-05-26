import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  School,
  User,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../context/auth-types";

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [role, setRole] = useState<UserRole>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = useMemo<FormErrors>(() => {
    const next: FormErrors = {};

    if (!fullName.trim()) {
      next.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      next.fullName = "Full name must be at least 2 characters.";
    }

    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      next.email = "Please enter a valid email address.";
    }

    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }

    return next;
  }, [fullName, email, password, confirmPassword]);

  const handleSignup = async () => {
    const nextErrors: FormErrors = { ...validationErrors };
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      await signUp(fullName.trim(), email.trim(), password, role);
      toast.success("Account created. You can now log in.");
      navigate("/auth/login_screen", { replace: true });
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
            <h1 className="theme-title text-3xl font-extrabold">Create Account</h1>
            <p className="mt-2 text-sm theme-muted">
              Join TrueSight and start building your classroom workspace.
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
                onClick={() => setRole("student")}
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
                onClick={() => setRole("teacher")}
                className={[
                  "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold",
                  role === "teacher" ? "text-white" : "text-[var(--app-muted)]",
                ].join(" ")}
              >
                <School className="h-4 w-4" />
                Teacher
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setErrors((current) => ({ ...current, general: undefined }));
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
                  placeholder="Enter your full name"
                  className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/80"
                />
              </div>
              {touched.fullName && validationErrors.fullName && (
                <p className="mt-1.5 text-xs text-rose-400">{validationErrors.fullName}</p>
              )}
            </div>

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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, general: undefined }));
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  placeholder="Create a password"
                  className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] py-2.5 pl-10 pr-10 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] transition hover:text-[var(--app-accent)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && validationErrors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--app-text)]">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setErrors((current) => ({ ...current, general: undefined }));
                  }}
                  onBlur={() =>
                    setTouched((current) => ({ ...current, confirmPassword: true }))
                  }
                  placeholder="Confirm your password"
                  className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] py-2.5 pl-10 pr-10 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)]/80"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] transition hover:text-[var(--app-accent)]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {touched.confirmPassword && validationErrors.confirmPassword && (
                <p className="mt-1.5 text-xs text-rose-400">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            {errors.general && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {errors.general}
              </div>
            )}

            <button
              type="button"
              onClick={handleSignup}
              disabled={isSubmitting}
              className="theme-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:translate-y-[-1px] hover:shadow-[var(--app-shadow)] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create {role === "student" ? "Student" : "Teacher"} Account
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/auth/login_screen")}
            className="mx-auto mt-5 block w-full text-center text-sm theme-muted transition hover:text-[var(--app-accent)]"
          >
            Already have an account?{" "}
            <span className="font-semibold text-[var(--app-accent)]">Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
