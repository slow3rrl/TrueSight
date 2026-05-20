const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

const getSeenKey = (userId: number) => `truesight-welcome-seen:${userId}`;

export const getHasSeenWelcome = (userId: number): boolean => {
  try {
    return localStorage.getItem(getSeenKey(userId)) === "true";
  } catch {
    return true;
  }
};

export const markWelcomeSeen = (userId: number): void => {
  try {
    localStorage.setItem(getSeenKey(userId), "true");
  } catch {
    // Ignore unavailable storage; greeting still renders from account age.
  }
};

export const getWelcomeGreeting = (
  createdAt: string | null | undefined,
  hasSeenWelcome: boolean,
): "Welcome" | "Welcome back" => {
  const createdTime = createdAt ? new Date(createdAt).getTime() : Number.NaN;
  const isFreshAccount =
    Number.isFinite(createdTime) && Date.now() - createdTime <= NEW_ACCOUNT_WINDOW_MS;

  return isFreshAccount && !hasSeenWelcome ? "Welcome" : "Welcome back";
};
