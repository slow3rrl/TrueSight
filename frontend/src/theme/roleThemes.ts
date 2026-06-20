import type { CSSProperties } from "react";
import type { UserRole } from "../context/auth-types";

export type RoleTheme = {
  role: UserRole;
  label: string;
  counterpartLabel: string;
  accent: string;
  accent2: string;
  tint: string;
  border: string;
  ring: string;
  glow: string;
  bg: string;
  bgSoft: string;
  surface: string;
  surfaceStrong: string;
  shadow: string;
  darkAccent: string;
  darkAccent2: string;
  darkBorder: string;
  darkRing: string;
  darkGlow: string;
  darkBg: string;
  darkBgSoft: string;
  darkSurface: string;
  darkSurfaceStrong: string;
  darkShadow: string;
};

export type RoleThemeStyle = CSSProperties & Record<`--${string}`, string>;

export const roleThemes: Record<UserRole, RoleTheme> = {
  student: {
    role: "student",
    label: "Student",
    counterpartLabel: "Teacher",
    accent: "#2563eb",
    accent2: "#06b6d4",
    tint: "#dbeafe",
    border: "#93c5fd",
    ring: "rgba(37, 99, 235, 0.28)",
    glow: "0 0 36px rgba(6, 182, 212, 0.24), 0 0 74px rgba(37, 99, 235, 0.16)",
    bg: "#f8fbff",
    bgSoft: "#eff6ff",
    surface: "#ffffff",
    surfaceStrong: "#f5f9ff",
    shadow: "0 20px 45px rgba(37, 99, 235, 0.12)",
    darkAccent: "#38bdf8",
    darkAccent2: "#22d3ee",
    darkBorder: "#1d4ed8",
    darkRing: "rgba(34, 211, 238, 0.32)",
    darkGlow: "0 0 42px rgba(34, 211, 238, 0.24), 0 0 90px rgba(37, 99, 235, 0.14)",
    darkBg: "#02050d",
    darkBgSoft: "#06101f",
    darkSurface: "#08111f",
    darkSurfaceStrong: "#0c1729",
    darkShadow: "0 24px 70px rgba(0, 0, 0, 0.46)",
  },
  teacher: {
    role: "teacher",
    label: "Teacher",
    counterpartLabel: "Student",
    accent: "#6d28d9",
    accent2: "#c2410c",
    tint: "#f5f3ff",
    border: "#c4b5fd",
    ring: "rgba(109, 40, 217, 0.3)",
    glow: "0 0 36px rgba(194, 65, 12, 0.18), 0 0 82px rgba(109, 40, 217, 0.2)",
    bg: "#fbf7ff",
    bgSoft: "#f3eefe",
    surface: "#fffbff",
    surfaceStrong: "#f8f3ff",
    shadow: "0 22px 50px rgba(91, 33, 182, 0.14)",
    darkAccent: "#c4b5fd",
    darkAccent2: "#fb923c",
    darkBorder: "#6d28d9",
    darkRing: "rgba(196, 181, 253, 0.34)",
    darkGlow: "0 0 42px rgba(251, 146, 60, 0.18), 0 0 92px rgba(109, 40, 217, 0.24)",
    darkBg: "#090613",
    darkBgSoft: "#150d26",
    darkSurface: "#120b22",
    darkSurfaceStrong: "#1a1130",
    darkShadow: "0 24px 70px rgba(0, 0, 0, 0.5)",
  },
};

const isDocumentDark = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export const getRoleThemeStyle = (role: UserRole, darkMode = isDocumentDark()): RoleThemeStyle => {
  const theme = roleThemes[role];
  const accent = darkMode ? theme.darkAccent : theme.accent;
  const accent2 = darkMode ? theme.darkAccent2 : theme.accent2;
  const border = darkMode ? theme.darkBorder : theme.border;
  const ring = darkMode ? theme.darkRing : theme.ring;
  const glow = darkMode ? theme.darkGlow : theme.glow;
  const bg = darkMode ? theme.darkBg : theme.bg;
  const bgSoft = darkMode ? theme.darkBgSoft : theme.bgSoft;
  const surface = darkMode ? theme.darkSurface : theme.surface;
  const surfaceStrong = darkMode ? theme.darkSurfaceStrong : theme.surfaceStrong;
  const shadow = darkMode ? theme.darkShadow : theme.shadow;

  return {
    "--auth-accent": accent,
    "--auth-accent-2": accent2,
    "--auth-tint": theme.tint,
    "--app-accent": accent,
    "--app-accent-2": accent2,
    "--app-border": border,
    "--app-ring": ring,
    "--app-glow": glow,
    "--app-bg": bg,
    "--app-bg-soft": bgSoft,
    "--app-surface": surface,
    "--app-surface-strong": surfaceStrong,
    "--app-shadow": shadow,
  };
};
