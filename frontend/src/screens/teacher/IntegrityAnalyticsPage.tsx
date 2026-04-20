import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarClock,
  Home,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { ActivityNotificationsPopover } from "../../components/ActivityNotificationsPopover";
import { useAuth } from "../../context/useAuth";
import {
  fetchTeacherAnalytics,
  fetchUserNotifications,
  type ActivityNotification,
  type TeacherAnalytics,
} from "./services/teacherClassroomService";
import {
  TeacherSidebar,
  type TeacherSection,
} from "./components/TeacherSidebar";

const SIDEBAR_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "classes", label: "Classes", icon: BookOpen },
  { key: "upcoming", label: "Upcoming", icon: CalendarClock },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

const REFRESH_INTERVAL_MS = 30_000;

export default function IntegrityAnalyticsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const payload = await fetchTeacherAnalytics();
      setAnalytics(payload);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load integrity analytics.";
      toast.error(message);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const payload = await fetchUserNotifications();
      setNotifications(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notifications.";
      toast.error(message);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadAnalytics(), loadNotifications()]);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void Promise.all([loadAnalytics(), loadNotifications()]);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore transport errors for deterministic logout UX.
    }

    navigate("/auth/login_screen", { replace: true });
  };

  const trendChartData = useMemo(
    () =>
      (analytics?.monthlyTrends ?? []).map((trend) => ({
        month: trend.month,
        submissions: trend.submissions,
        flagged: trend.flaggedOutputs,
        integrityScore: trend.averageIntegrityScore ?? 0,
      })),
    [analytics],
  );

  const classRiskData = useMemo(
    () =>
      (analytics?.topSuspiciousClasses ?? []).map((item) => ({
        className:
          item.className.length > 18 ? `${item.className.slice(0, 18)}...` : item.className,
        flagged: item.flaggedOutputs,
        submissions: item.submissions,
        integrityScore: item.averageIntegrityScore ?? 0,
      })),
    [analytics],
  );

  const updatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString()
    : "Not synced yet";

  return (
    <div className="min-h-screen bg-transparent text-[var(--app-text)]">
      <TeacherSidebar
        items={[...SIDEBAR_ITEMS]}
        activeSection={"home" as TeacherSection}
        mobileOpen={mobileSidebarOpen}
        onSelect={(section) => navigate(`/teacher/teacher_screen/${section}`)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <header className="sticky top-0 z-10 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_78%,transparent)] backdrop-blur-md md:ml-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] md:hidden"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs theme-muted">Teacher Panel</p>
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Integrity Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlobalThemeToggle />
            <ActivityNotificationsPopover
              notifications={notifications}
              open={notificationsOpen}
              loading={isLoadingNotifications}
              onToggle={() => setNotificationsOpen((current) => !current)}
              onClose={() => setNotificationsOpen(false)}
              onRefresh={() => void loadNotifications()}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-10 sm:px-6 md:ml-20">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/teacher/teacher_screen/home")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => void loadAnalytics()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Now
          </Button>
          <p className="text-xs theme-muted">Live sync every 30 seconds. Last update: {updatedLabel}</p>
        </div>

        {loading ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Loading integrity analytics charts...
            </CardContent>
          </Card>
        ) : !analytics ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Analytics data is unavailable right now.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="theme-card">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs theme-muted">Total submissions</p>
                  <p className="text-2xl font-bold text-[var(--app-text)]">
                    {analytics.totals.totalSubmissions}
                  </p>
                </CardContent>
              </Card>
              <Card className="theme-card">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs theme-muted">Flagged outputs</p>
                  <p className="text-2xl font-bold text-[var(--app-text)]">
                    {analytics.totals.flaggedOutputs}
                  </p>
                </CardContent>
              </Card>
              <Card className="theme-card">
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center gap-2 text-xs theme-muted">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    <span>Average integrity score</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--app-text)]">
                    {analytics.totals.averageIntegrityScore !== null
                      ? `${analytics.totals.averageIntegrityScore.toFixed(2)}%`
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">
                  Real-time monthly integrity trends
                </h3>
                {trendChartData.length === 0 ? (
                  <p className="text-sm theme-muted">No monthly trend data to visualize yet.</p>
                ) : (
                  <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendChartData} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(173, 144, 214, 0.25)" />
                        <XAxis dataKey="month" stroke="var(--app-muted)" />
                        <YAxis yAxisId="counts" stroke="var(--app-muted)" />
                        <YAxis yAxisId="score" orientation="right" stroke="var(--app-muted)" domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="score"
                          type="monotone"
                          dataKey="integrityScore"
                          name="Integrity Score %"
                          stroke="#34d399"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="counts"
                          type="monotone"
                          dataKey="submissions"
                          name="Submissions"
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="counts"
                          type="monotone"
                          dataKey="flagged"
                          name="Flagged"
                          stroke="#fb7185"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">
                  Class-level suspicious output distribution
                </h3>
                {classRiskData.length === 0 ? (
                  <p className="text-sm theme-muted">No class-level analytics available yet.</p>
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classRiskData} margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(173, 144, 214, 0.25)" />
                        <XAxis dataKey="className" stroke="var(--app-muted)" />
                        <YAxis yAxisId="counts" stroke="var(--app-muted)" />
                        <YAxis yAxisId="score" orientation="right" domain={[0, 100]} stroke="var(--app-muted)" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="counts" dataKey="submissions" name="Submissions" fill="#a855f7" radius={[6, 6, 0, 0]} />
                        <Bar yAxisId="counts" dataKey="flagged" name="Flagged" fill="#fb7185" radius={[6, 6, 0, 0]} />
                        <Line
                          yAxisId="score"
                          type="monotone"
                          dataKey="integrityScore"
                          name="Integrity Score %"
                          stroke="#34d399"
                          strokeWidth={2.5}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
