import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  Home,
  Menu,
  Settings,
  WandSparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import { useAuth } from "../../context/useAuth";
import {
  analyzeSingleSubmission,
  fetchSubmissionDetail,
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
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

export default function SubmissionAnalysisReportPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { logout } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submission, setSubmission] = useState<ClassSubmission | null>(null);

  const loadSubmission = async () => {
    if (!submissionId) return;

    setLoading(true);
    try {
      const response = await fetchSubmissionDetail(submissionId);
      setSubmission(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load report.";
      toast.error(message);
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout transport errors and keep flow deterministic.
    }

    navigate("/auth/login_screen", { replace: true });
  };

  const handleAnalyze = async () => {
    if (!submissionId || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      await analyzeSingleSubmission(submissionId);
      toast.success("Analysis updated.");
      await loadSubmission();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run analysis.";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const details = useMemo(
    () => (isRecord(submission?.analysisDetails) ? submission.analysisDetails : null),
    [submission],
  );
  const reasons = Array.isArray(details?.reasons)
    ? details.reasons.map((item) => String(item))
    : [];
  const metrics = isRecord(details?.metrics) ? details.metrics : null;
  const verdict =
    details && typeof details.verdict === "string"
      ? details.verdict
      : "No analysis verdict yet";

  return (
    <div className="min-h-screen bg-transparent text-[var(--app-text)]">
      <TeacherSidebar
        items={[...SIDEBAR_ITEMS]}
        activeSection={"classes" as TeacherSection}
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
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs theme-muted">Teacher Panel</p>
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Analysis Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlobalThemeToggle />
            <button className="theme-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-border text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-10 sm:px-6 md:ml-20">
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
              onClick={() => navigate(`/teacher/submissions/${submissionId}`)}
            >
              Open Submission Page
            </Button>
          )}
          <Button onClick={() => void handleAnalyze()} disabled={isAnalyzing || !submissionId}>
            <WandSparkles className="mr-2 h-4 w-4" />
            {isAnalyzing ? "Analyzing..." : "Run/Re-run Analysis"}
          </Button>
        </div>

        {loading ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">Loading analysis report...</CardContent>
          </Card>
        ) : !submission ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Report not found or access denied.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-2xl font-bold text-[var(--app-text)]">
                  {submission.activityTitle}
                </h2>
                <p className="text-sm theme-muted">
                  Student: {submission.studentName} ({submission.studentEmail})
                </p>
                <p className="text-sm theme-muted">
                  Class: {submission.className ?? "Class"} | Status: {submission.status}
                </p>
              </CardContent>
            </Card>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Probability Summary</h3>
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

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Detailed Reasons</h3>
                {reasons.length === 0 ? (
                  <p className="text-sm theme-muted">
                    No detailed reasons yet. Run analysis to populate this report.
                  </p>
                ) : (
                  <ul className="list-disc space-y-2 pl-6 text-sm text-[var(--app-text)]">
                    {reasons.map((reason, index) => (
                      <li key={`reason-${index}`}>{reason}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="theme-card">
              <CardContent className="space-y-3 p-5">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">Metrics</h3>
                {!metrics ? (
                  <p className="text-sm theme-muted">
                    Metrics are unavailable for this submission.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(metrics).map(([key, value]) => {
                      const numericValue = asNumber(value);
                      const renderedValue =
                        numericValue !== null ? numericValue.toFixed(3) : String(value);

                      return (
                        <div
                          key={key}
                          className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3"
                        >
                          <p className="text-xs uppercase tracking-wide theme-muted">{key}</p>
                          <p className="text-base font-semibold text-[var(--app-text)]">
                            {renderedValue}
                          </p>
                        </div>
                      );
                    })}
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
