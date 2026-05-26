import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/$/, "");

type GoogleAuthConfig = {
  configured: boolean;
  loading: boolean;
  status: "checking" | "ready" | "missing-client-id" | "backend-unreachable";
  message: string;
};

const GoogleAuthConfigContext = createContext<GoogleAuthConfig>({
  configured: false,
  loading: true,
  status: "checking",
  message: "Checking Google sign-in configuration.",
});

export function useGoogleAuthConfig() {
  return useContext(GoogleAuthConfigContext);
}

export function RuntimeGoogleOAuthProvider({ children }: { children: ReactNode }) {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const [runtimeClientId, setRuntimeClientId] = useState("");
  const [loading, setLoading] = useState(!envClientId);
  const [status, setStatus] = useState<GoogleAuthConfig["status"]>(
    envClientId ? "ready" : "checking",
  );
  const [message, setMessage] = useState(
    envClientId
      ? "Google sign-in is configured from the frontend environment."
      : "Checking Google sign-in configuration.",
  );

  useEffect(() => {
    if (envClientId) {
      setStatus("ready");
      setMessage("Google sign-in is configured from the frontend environment.");
      setLoading(false);
      return;
    }

    let active = true;

    const loadGoogleConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/google/config`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Google auth config endpoint is unavailable.");
        }

        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (active && typeof payload.clientId === "string") {
          setRuntimeClientId(payload.clientId);
          setStatus("ready");
          setMessage("Google sign-in is configured from the backend environment.");
        } else if (active) {
          setRuntimeClientId("");
          setStatus("missing-client-id");
          setMessage(
            "Google Client ID is missing. Add GOOGLE_CLIENT_ID to backend/.env or VITE_GOOGLE_CLIENT_ID to frontend/.env.",
          );
        }
      } catch {
        if (active) {
          setRuntimeClientId("");
          setStatus("backend-unreachable");
          setMessage(
            "Google configuration endpoint is unavailable. Restart the backend or check VITE_API_BASE_URL.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGoogleConfig();

    return () => {
      active = false;
    };
  }, [envClientId]);

  const clientId = envClientId || runtimeClientId;
  const config = useMemo(
    () => ({
      configured: Boolean(clientId),
      loading,
      status,
      message,
    }),
    [clientId, loading, status, message],
  );

  const content = (
    <GoogleAuthConfigContext.Provider value={config}>
      {children}
    </GoogleAuthConfigContext.Provider>
  );

  if (!clientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={clientId}>{content}</GoogleOAuthProvider>;
}
