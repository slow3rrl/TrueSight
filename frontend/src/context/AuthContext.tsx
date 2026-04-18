import { createContext, useEffect, useState } from "react";
import type { AuthContextType, AuthUser, UserRole } from "./auth-types";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://localhost:5000/api/auth";

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));

    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<void> => {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Signup failed");
    }

    // Do not set the user here because signup should return to login first
    // setUser(data.user);
  } finally {
    setLoading(false);
  }
};

  const getMyProfile = async (): Promise<AuthUser | null> => {
    const res = await fetch(`${API_URL}/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch profile");
    }

    return data.user;
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
        signUp,
        getMyProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
