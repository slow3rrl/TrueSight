import type { NavigateFunction } from "react-router-dom";

export const navigateBack = (navigate: NavigateFunction, fallback: string) => {
  const state = window.history.state as { idx?: number } | null;

  if (typeof state?.idx === "number" && state.idx > 0) {
    navigate(-1);
    return;
  }

  navigate(fallback, { replace: true });
};
