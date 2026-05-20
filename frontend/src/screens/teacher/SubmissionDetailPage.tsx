import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  FileText,
  Home,
  Menu,
  Settings,
  WandSparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { ActivityNotificationsPopover } from "../../components/ActivityNotificationsPopover";
import { useAuth } from "../../context/useAuth";
import {
  analyzeSingleSubmission,
  fetchSubmissionDetail,
  fetchUserNotifications,
  type ActivityNotification,
  type ClassSubmission,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export default function SubmissionDetailPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { logout } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submission, setSubmission] = useState<ClassSubmission | null>(null);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const loadSubmission = async () => {
    if (!submissionId) return;

    setLoading(true);
    try {
      const response = await fetchSubmissionDetail(submissionId);
      setSubmission(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load submission.";
      toast.error(message);
      setSubmission(null);
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
    void Promise.all([loadSubmission(), loadNotifications()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore network issues on logout and proceed to auth screen.
    }

    navigate("/auth/login_screen", { replace: true });
  };

  const handleAnalyze = async () => {
    if (!submissionId || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeSingleSubmission(submissionId);
      const confidenceText =
        typeof result.confidenceScore === "number"
          ? ` (${result.confidenceScore.toFixed(2)}% confidence)`
          : "";
      toast.success(`Submission analyzed${confidenceText}.`);
      await loadSubmission();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze submission.";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderSubmissionContent = () => {
    if (!submission) return null;

    if (submission.contentText?.trim()) {
      return (
        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4 text-sm text-[var(--app-text)]">
          {submission.contentText}
        </pre>
      );
    }

    return (
      <div className="rounded-xl border border-dashed theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4 text-sm theme-muted">
        No text content is available. File-only submission.
      </div>
    );
  };

  const analysisDetails = isRecord(submission?.analysisDetails)
    ? submission.analysisDetails
    : null;
  const verdict =
    analysisDetails && typeof analysisDetails.verdict === "string"
      ? analysisDetails.verdict
      : "Not analyzed yet";

  return (
    <div className="h-screen overflow-hidden bg-transparent text-[var(--app-text)]">
      <TeacherSidebar
        items={[...SIDEBAR_ITEMS]}
        activeSection={"classes" as TeacherSection}
        mobileOpen={mobileSidebarOpen}
        onSelect={(section) => navigate(`/teacher/teacher_screen/${section}`)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <header className="fixed left-0 right-0 top-0 z-10 h-16 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_78%,transparent)] backdrop-blur-md md:left-20">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs theme-muted">Teacher Panel</p>
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Submission Detail
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

      <main
        data-route-scroll-container
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto px-4 py-6 pb-10 sm:px-6 md:left-20"
      >
        <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/teacher/teacher_screen/classes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
          {submissionId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/teacher/submissions/${submissionId}/analysis`)}
            >
              Open Analysis Report
            </Button>
          )}
          {submissionId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/documents/submission/${submissionId}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Preview Document
            </Button>
          )}
          <Button onClick={() => void handleAnalyze()} disabled={isAnalyzing || !submissionId}>
            <WandSparkles className="mr-2 h-4 w-4" />
            {isAnalyzing ? "Analyzing..." : "Analyze Submission"}
          </Button>
        </div>

        {loading ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">Loading submission...</CardContent>
          </Card>
        ) : !submission ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Submission not found or access denied.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-2xl font-bold text-[var(--app-text)]">
                  {submission.activityTitle}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Student</p>
                    <p className="font-semibold text-[var(--app-text)]">{submission.studentName}</p>
                    <p className="text-xs theme-muted">{submission.studentEmail}</p>
                  </div>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Class</p>
                    <p className="font-semibold text-[var(--app-text)]">
                      {submission.className ?? "Class"}
                    </p>
                    <p className="text-xs theme-muted">ID: {submission.classId ?? "N/A"}</p>
                  </div>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Status</p>
                    <p className="font-semibold text-[var(--app-text)]">{submission.status}</p>
                    <p className="text-xs theme-muted">
                      Submitted: {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Submission Type</p>
                    <p className="font-semibold text-[var(--app-text)]">{submission.submissionType}</p>
                    <p className="text-xs theme-muted">
                      Due: {new Date(submission.dueDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Submission Content</h3>
                {submission.fileName && (
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/submission/${submission.id}`)}
                    className="theme-ring inline-flex items-center gap-2 rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] px-3 py-2 text-sm text-[var(--app-text)] transition hover:border-[var(--app-accent)]"
                  >
                    <FileText className="h-4 w-4 text-[var(--app-accent)]" />
                    {submission.fileName}
                  </button>
                )}
                {renderSubmissionContent()}
              </CardContent>
            </Card>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Analysis Snapshot</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">AI Probability</p>
                    <p className="text-lg font-bold text-[var(--app-text)]">
                      {typeof submission.aiProbability === "number"
                        ? `${submission.aiProbability.toFixed(2)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Human Probability</p>
                    <p className="text-lg font-bold text-[var(--app-text)]">
                      {typeof submission.humanProbability === "number"
                        ? `${submission.humanProbability.toFixed(2)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                    <p className="text-xs theme-muted">Confidence Score</p>
                    <p className="text-lg font-bold text-[var(--app-text)]">
                      {typeof submission.confidenceScore === "number"
                        ? `${submission.confidenceScore.toFixed(2)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                  <p className="text-xs theme-muted">Verdict</p>
                  <p className="font-semibold text-[var(--app-text)]">{verdict}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
