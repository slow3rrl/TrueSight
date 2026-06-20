import { AppLogo } from "./AppLogo";
import type { UserRole } from "../context/auth-types";
import { getRoleThemeStyle, roleThemes } from "../theme/roleThemes";

type DashboardSkeletonProps = {
  role: UserRole;
  darkMode?: boolean;
};

export function DashboardSkeleton({ role, darkMode }: DashboardSkeletonProps) {
  const theme = roleThemes[role];

  return (
    <div
      className="role-theme-page h-screen overflow-hidden text-[var(--app-text)]"
      style={getRoleThemeStyle(role, darkMode)}
      aria-busy="true"
      aria-live="polite"
    >
      <aside className="theme-surface fixed left-0 top-0 hidden h-screen w-20 px-3 py-4 md:block">
        <AppLogo variant="icon" iconClassName="h-11 w-11 rounded-2xl" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: role === "teacher" ? 6 : 3 }).map((_, index) => (
            <div
              key={index}
              className="h-10 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] skeleton-shimmer"
            />
          ))}
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 h-20 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_82%,transparent)] backdrop-blur-md md:left-20">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] skeleton-shimmer md:hidden" />
            <div>
              <div className="h-3 w-32 rounded-full bg-[color-mix(in_srgb,var(--app-muted)_20%,transparent)] skeleton-shimmer" />
              <div className="mt-3 h-5 w-56 max-w-[52vw] rounded-full bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] skeleton-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] skeleton-shimmer" />
            <div className="h-10 w-10 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] skeleton-shimmer" />
          </div>
        </div>
      </header>

      <main className="fixed inset-x-0 bottom-0 top-20 overflow-hidden px-4 py-6 sm:px-6 md:left-20">
        <div className="mx-auto grid max-w-6xl gap-5">
          <section className="theme-surface rounded-3xl p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <div className="h-4 w-36 rounded-full bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] skeleton-shimmer" />
                <div className="h-9 w-72 max-w-full rounded-full bg-[color-mix(in_srgb,var(--app-text)_16%,transparent)] skeleton-shimmer" />
                <div className="h-4 w-96 max-w-full rounded-full bg-[color-mix(in_srgb,var(--app-muted)_20%,transparent)] skeleton-shimmer" />
              </div>
              <div className="h-12 w-40 rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-accent)_34%,transparent),color-mix(in_srgb,var(--app-accent-2)_34%,transparent))] skeleton-shimmer" />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="theme-card rounded-2xl p-5">
                <div className="h-4 w-20 rounded-full bg-[color-mix(in_srgb,var(--app-muted)_22%,transparent)] skeleton-shimmer" />
                <div className="mt-5 h-8 w-16 rounded-full bg-[color-mix(in_srgb,var(--app-accent)_22%,transparent)] skeleton-shimmer" />
              </div>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="theme-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded-full bg-[color-mix(in_srgb,var(--app-text)_14%,transparent)] skeleton-shimmer" />
                <div className="h-9 w-24 rounded-xl bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] skeleton-shimmer" />
              </div>
              <div className="mt-6 h-56 rounded-2xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-accent)_16%,transparent),color-mix(in_srgb,var(--app-surface-strong)_80%,transparent))] skeleton-shimmer" />
            </div>

            <div className="theme-card rounded-2xl p-5">
              <div className="h-5 w-36 rounded-full bg-[color-mix(in_srgb,var(--app-text)_14%,transparent)] skeleton-shimmer" />
              <div className="mt-5 space-y-3">
                {Array.from({ length: role === "teacher" ? 5 : 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 rounded-2xl bg-[color-mix(in_srgb,var(--app-surface-strong)_86%,transparent)] skeleton-shimmer"
                  />
                ))}
              </div>
            </div>
          </section>

          <p className="sr-only">Loading {theme.label.toLowerCase()} dashboard</p>
        </div>
      </main>
    </div>
  );
}
