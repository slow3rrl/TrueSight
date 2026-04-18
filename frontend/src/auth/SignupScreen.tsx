import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Sun,
  School,
  User,
  Mail,
  Lock,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { type UserRole } from "../context/auth-types";

type FormErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signUp, darkMode, toggleTheme } = useAuth();

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

  if (Object.keys(nextErrors).length > 0) {
    return;
  }

  try {
    setIsSubmitting(true);
    setErrors({});

    // ✅ FIXED ORDER HERE
    await signUp(fullName.trim(), email.trim(), password, role);
     toast.success("Account created successfully! You can now log in.");

    navigate("/auth/login_screen", {
      replace: true,
    });
  } catch (error: unknown) {
    setErrors({
      general: getErrorMessage(error),
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const cardClass = darkMode
    ? "border-white/10 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
    : "border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.18)]";

  const inputBase = darkMode
    ? "border-white/10 bg-white/5 text-white placeholder:text-slate-400"
    : "border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400";

  const iconColor = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[radial-gradient(circle_at_top,#14213d_0%,#020617_55%,#01040b_100%)] text-white"
          : "bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_45%,#f8fafc_100%)] text-slate-900"
      }`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-80px] top-[-80px] h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-60px] h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-end">
            <button
              onClick={toggleTheme}
              type="button"
              className={`inline-flex items-center justify-center rounded-full border p-3 backdrop-blur-xl transition hover:scale-105 ${
                darkMode
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-slate-200 bg-white/70 text-slate-900"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div
            className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${cardClass}`}
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src="https://via.placeholder.com/80"
                alt="TrueSight Logo"
                className="mb-4 h-20 w-20 rounded-2xl object-cover ring-2 ring-blue-500/40"
              />
              <h1 className="text-3xl font-bold">Sign Up</h1>
              <p
                className={`mt-2 text-sm ${
                  darkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Join TrueSight and start your journey
              </p>
            </div>

            <div className="mb-6">
              <div
                className={`relative flex rounded-2xl border p-1 ${
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-slate-100/80"
                }`}
              >
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-blue-600 shadow-lg transition-transform duration-300 ease-out ${
                    role === "student" ? "translate-x-0" : "translate-x-full"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                    role === "student"
                      ? "text-white"
                      : darkMode
                        ? "text-slate-300"
                        : "text-slate-600"
                  }`}
                >
                  <School size={18} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
                    role === "teacher"
                      ? "text-white"
                      : darkMode
                        ? "text-slate-300"
                        : "text-slate-600"
                  }`}
                >
                  <School size={18} />
                  Teacher
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setErrors((prev) => ({ ...prev, general: undefined }));
                    }}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, fullName: true }))
                    }
                    placeholder="Enter your full name"
                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${inputBase}`}
                  />
                </div>
                {touched.fullName && validationErrors.fullName && (
                  <p className="mt-2 text-sm text-rose-400">
                    {validationErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, general: undefined }));
                    }}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, email: true }))
                    }
                    placeholder="Enter your email"
                    className={`w-full rounded-2xl border py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${inputBase}`}
                  />
                </div>
                {touched.email && validationErrors.email && (
                  <p className="mt-2 text-sm text-rose-400">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, general: undefined }));
                    }}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, password: true }))
                    }
                    placeholder="Enter password"
                    className={`w-full rounded-2xl border py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${inputBase}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {touched.password && validationErrors.password && (
                  <p className="mt-2 text-sm text-rose-400">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, general: undefined }));
                    }}
                    onBlur={() =>
                      setTouched((prev) => ({
                        ...prev,
                        confirmPassword: true,
                      }))
                    }
                    placeholder="Confirm password"
                    className={`w-full rounded-2xl border py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ${inputBase}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${iconColor}`}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {touched.confirmPassword &&
                  validationErrors.confirmPassword && (
                    <p className="mt-2 text-sm text-rose-400">
                      {validationErrors.confirmPassword}
                    </p>
                  )}
              </div>

              {errors.general && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    darkMode
                      ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                      : "border-rose-200 bg-rose-50 text-rose-600"
                  }`}
                >
                  {errors.general}
                </div>
              )}

              <button
                type="button"
                onClick={handleSignup}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create {role === "student" ? "Student" : "Teacher"} Account
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/auth/login_screen")}
              className={`mt-6 w-full text-center text-sm ${
                darkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Already have an account?{" "}
              <span className="font-semibold text-blue-500">Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
