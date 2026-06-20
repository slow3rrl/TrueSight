const getDevApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5000/api";
  }

  return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? getDevApiBaseUrl() : "/api")
).replace(/\/$/, "");
