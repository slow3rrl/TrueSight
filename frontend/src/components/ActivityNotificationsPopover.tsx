import { useEffect, useMemo, useRef } from "react";
import {
  Bell,
  CalendarClock,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ActivityNotification } from "../services/classService";

type ActivityNotificationsPopoverProps = {
  notifications: ActivityNotification[];
  open: boolean;
  loading: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRefresh: () => void;
};

const formatEventTime = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
};

export function ActivityNotificationsPopover({
  notifications,
  open,
  loading,
  onToggle,
  onClose,
  onRefresh,
}: ActivityNotificationsPopoverProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current.contains(target)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
    };
  }, [open, onClose]);

  const notificationCount = useMemo(() => notifications.length, [notifications]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]"
      >
        <Bell className="h-5 w-5" />
      </button>
      {notificationCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {notificationCount > 9 ? "9+" : notificationCount}
        </span>
      )}

      {open && (
        <div className="theme-surface absolute right-0 z-50 mt-2 w-[min(92vw,360px)] rounded-2xl p-3 shadow-[var(--app-shadow)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--app-text)]">Notifications</p>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs theme-muted hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]"
            >
              <RefreshCw className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(" ")} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="rounded-xl border theme-border p-3 text-xs theme-muted">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed theme-border p-3 text-xs theme-muted">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] p-3"
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {notification.type === "new_submission" ? (
                        <Send className="h-4 w-4 text-[var(--app-accent)]" />
                      ) : notification.type === "new_activity" ? (
                        <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
                      ) : notification.severity === "warning" ? (
                        <TriangleAlert className="h-4 w-4 text-rose-300" />
                      ) : (
                        <CalendarClock className="h-4 w-4 text-amber-300" />
                      )}
                      <p className="text-xs font-semibold text-[var(--app-text)]">
                        {notification.title}
                      </p>
                    </div>
                    <span className="text-[10px] theme-muted">
                      {formatEventTime(notification.eventAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--app-text)]">{notification.message}</p>
                  <p className="mt-1 text-[11px] theme-muted">
                    {notification.className} | {notification.activityTitle}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
