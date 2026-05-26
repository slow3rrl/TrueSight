import { createContext, useEffect, useState } from "react";
import type { AuthContextType, AuthUser, UserRole } from "./auth-types";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/auth`;
const DARK_MODE_KEY = "darkMode";
const LEGACY_THEME_KEY = "truesight-theme";

const normalizeUser = (input: Record<string, unknown> | null): AuthUser | null => {
  if (!input) return null;

  return {
    id: Number(input.id),
    name: String(input.name ?? ""),
    email: String(input.email ?? ""),
    role: (input.role === "teacher" ? "teacher" : "student") as UserRole,
    created_at: String(input.created_at ?? ""),
    profileImageUrl:
      typeof input.profile_image_url === "string"
        ? input.profile_image_url
        : typeof input.profileImageUrl === "string"
          ? input.profileImageUrl
          : null,
    notifications:
      typeof input.notifications === "boolean"
        ? input.notifications
        : typeof input.notifications_enabled === "boolean"
          ? input.notifications_enabled
          : true,
  };
};

const getInitialDarkMode = () => {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  if (saved === "true") return true;
  if (saved === "false") return false;

  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "dark") return true;
  if (legacy === "light") return false;

  // Dark is the default when no preference has been saved yet.
  return true;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
    localStorage.setItem(LEGACY_THEME_KEY, darkMode ? "dark" : "light");

    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      try {
        const response = await fetch(`${API_URL}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const profile = normalizeUser((payload.user as Record<string, unknown>) ?? null);

        if (active && profile) {
          setUser(profile);
        }
      } catch {
        // Silent by design; unauthenticated users should remain on auth routes.
      }
    };

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = () => {
    setDarkMode((previous) => !previous);
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string" ? payload.message : "Login failed.",
        );
      }

      setUser(normalizeUser((payload.user as Record<string, unknown>) ?? null));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (
    credential: string,
    role: UserRole,
  ): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ credential, role }),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "Google login failed.",
        );
      }

      const profile = normalizeUser((payload.user as Record<string, unknown>) ?? null);

      if (!profile) {
        throw new Error("Failed to parse Google account profile.");
      }

      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name, email, password, role }),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string" ? payload.message : "Signup failed.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getMyProfile = async (): Promise<AuthUser | null> => {
    const response = await fetch(`${API_URL}/me`, {
      method: "GET",
      credentials: "include",
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        typeof payload.message === "string"
          ? payload.message
          : "Failed to fetch profile.",
      );
    }

    const profile = normalizeUser((payload.user as Record<string, unknown>) ?? null);
    setUser(profile);
    return profile;
  };

  const updateAccount = async (input: {
    name: string;
    email: string;
    notifications: boolean;
    profileImageUrl: string | null;
  }): Promise<AuthUser> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "Failed to update account.",
        );
      }

      const updated = normalizeUser((payload.user as Record<string, unknown>) ?? null);

      if (!updated) {
        throw new Error("Failed to parse updated account profile.");
      }

      setUser(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "DELETE",
        credentials: "include",
      });

      const payload = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "Failed to delete account.",
        );
      }

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        darkMode,
        toggleTheme,
        signIn,
        signInWithGoogle,
        signUp,
        getMyProfile,
        updateAccount,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
