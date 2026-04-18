import { AnimatePresence, motion } from "framer-motion";
import { Plus, WandSparkles, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import type {
  ActivitySubmissionType,
  ClassActivity,
  ClassSubmission,
  EnrolledStudent,
  TeacherClass,
} from "../services/teacherClassroomService";

type ActivityFormState = {
  title: string;
  instructor: string;
  description: string;
  submissionType: ActivitySubmissionType;
  dueDate: string;
};

type TeacherClassManagerModalProps = {
  open: boolean;
  classroom: TeacherClass | null;
  loading: boolean;
  activities: ClassActivity[];
  students: EnrolledStudent[];
  submissions: ClassSubmission[];
  activityForm: ActivityFormState;
  isCreatingActivity: boolean;
  isAnalyzing: boolean;
  expandedSubmissionId: string | null;
  onClose: () => void;
  onAnalyzeAll: () => void;
  onSubmitActivity: (event: React.FormEvent) => void;
  onChangeActivityForm: (patch: Partial<ActivityFormState>) => void;
  onToggleSubmission: (submissionId: string) => void;
  getProbabilityTone: (probability: number | null) => string;
};

export function TeacherClassManagerModal({
  open,
  classroom,
  loading,
  activities,
  students,
  submissions,
  activityForm,
  isCreatingActivity,
  isAnalyzing,
  expandedSubmissionId,
  onClose,
  onAnalyzeAll,
  onSubmitActivity,
  onChangeActivityForm,
  onToggleSubmission,
  getProbabilityTone,
}: TeacherClassManagerModalProps) {
  return (
    <AnimatePresence>
      {open && classroom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            className="absolute inset-0 bg-[var(--sidebar-backdrop)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="theme-surface relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3 border-b theme-border px-6 py-4">
              <div>
                <p className="text-sm font-medium theme-title">Class Manager</p>
                <h3 className="text-xl font-bold text-[var(--app-text)]">{classroom.name}</h3>
              </div>
              <button
                onClick={onClose}
                className="theme-ring inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-72px)] space-y-6 overflow-y-auto p-6">
              {loading ? (
                <p className="text-sm theme-muted">Loading class data...</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Card className="theme-card">
                      <CardContent className="p-3">
                        <p className="text-xs theme-muted">Students Enrolled</p>
                        <p className="text-xl font-bold text-[var(--app-text)]">{students.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="theme-card">
                      <CardContent className="p-3">
                        <p className="text-xs theme-muted">Activities</p>
                        <p className="text-xl font-bold text-[var(--app-text)]">{activities.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="theme-card">
                      <CardContent className="p-3">
                        <p className="text-xs theme-muted">Submissions</p>
                        <p className="text-xl font-bold text-[var(--app-text)]">{submissions.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="theme-card">
                      <CardContent className="p-3">
                        <p className="text-xs theme-muted">Join Code</p>
                        <p className="font-mono font-bold text-[var(--app-text)]">{classroom.code}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="theme-card">
                    <CardContent className="space-y-4 p-5">
                      <h4 className="text-lg font-semibold text-[var(--app-text)]">Create Activity</h4>

                      <form onSubmit={onSubmitActivity} className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            value={activityForm.title}
                            onChange={(event) => onChangeActivityForm({ title: event.target.value })}
                            placeholder="Activity title"
                            required
                            className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
                          />
                          <Input
                            value={activityForm.instructor}
                            onChange={(event) =>
                              onChangeActivityForm({ instructor: event.target.value })
                            }
                            placeholder="Instructor"
                            required
                            className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
                          />
                        </div>

                        <textarea
                          value={activityForm.description}
                          onChange={(event) =>
                            onChangeActivityForm({ description: event.target.value })
                          }
                          rows={3}
                          placeholder="Activity description"
                          className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] px-3 py-2 text-sm text-[var(--app-text)]"
                          required
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={activityForm.submissionType}
                            onChange={(event) =>
                              onChangeActivityForm({
                                submissionType: event.target.value as ActivitySubmissionType,
                              })
                            }
                            className="theme-ring h-10 rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] px-3 text-sm text-[var(--app-text)]"
                          >
                            <option value="essay">Essays</option>
                            <option value="file">Files</option>
                          </select>
                          <Input
                            type="datetime-local"
                            value={activityForm.dueDate}
                            onChange={(event) => onChangeActivityForm({ dueDate: event.target.value })}
                            required
                            className="bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)]"
                          />
                        </div>

                        <Button type="submit" disabled={isCreatingActivity}>
                          <Plus className="mr-2 h-4 w-4" />
                          {isCreatingActivity ? "Creating..." : "Add Activity"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="theme-card">
                    <CardContent className="space-y-3 p-5">
                      <h4 className="text-lg font-semibold text-[var(--app-text)]">Enrolled Students</h4>

                      {students.length === 0 ? (
                        <p className="text-sm theme-muted">No enrolled students yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {students.map((student) => (
                            <div
                              key={student.id}
                              className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium text-[var(--app-text)]">{student.name}</p>
                                  <p className="text-xs theme-muted">{student.email}</p>
                                </div>
                                <p className="text-xs theme-muted">{student.submissionCount} submissions</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="theme-card">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="text-lg font-semibold text-[var(--app-text)]">
                          Submissions & AI Analysis
                        </h4>
                        <Button
                          onClick={onAnalyzeAll}
                          disabled={isAnalyzing || submissions.length === 0}
                        >
                          <WandSparkles className="mr-2 h-4 w-4" />
                          {isAnalyzing ? "Analyzing..." : "Analyze All"}
                        </Button>
                      </div>

                      {submissions.length === 0 ? (
                        <p className="text-sm theme-muted">No submissions yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {submissions.map((submission) => {
                            const expanded = expandedSubmissionId === submission.id;

                            return (
                              <div
                                key={submission.id}
                                className="rounded-2xl border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_95%,transparent)] p-4 space-y-3"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-semibold text-[var(--app-text)]">
                                      {submission.studentName}
                                    </p>
                                    <p className="text-xs theme-muted">{submission.studentEmail}</p>
                                    <p className="mt-1 text-sm text-[var(--app-text)]">
                                      {submission.activityTitle}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={[
                                        "rounded-full px-2 py-1 text-xs",
                                        getProbabilityTone(submission.aiProbability),
                                      ].join(" ")}
                                    >
                                      {typeof submission.aiProbability === "number"
                                        ? `${submission.aiProbability.toFixed(2)}% AI probability`
                                        : "Not analyzed"}
                                    </span>
                                    <p className="mt-1 text-xs theme-muted">{submission.status}</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => onToggleSubmission(submission.id)}
                                  className="text-sm text-[var(--app-accent)] hover:underline"
                                >
                                  {expanded ? "Hide" : "View"} detailed analysis
                                </button>

                                {expanded && (
                                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3 space-y-2 text-sm text-[var(--app-text)]">
                                    {submission.contentText && (
                                      <div>
                                        <p className="font-medium">Submission Content</p>
                                        <p className="whitespace-pre-wrap text-xs theme-muted">
                                          {submission.contentText}
                                        </p>
                                      </div>
                                    )}

                                    {submission.analysisDetails ? (
                                      <>
                                        {typeof submission.analysisDetails.verdict === "string" && (
                                          <p>
                                            <span className="font-medium">Verdict:</span>{" "}
                                            {submission.analysisDetails.verdict}
                                          </p>
                                        )}

                                        {Array.isArray(submission.analysisDetails.reasons) && (
                                          <div>
                                            <p className="font-medium">Reasons</p>
                                            <ul className="list-disc space-y-1 pl-5 text-xs theme-muted">
                                              {submission.analysisDetails.reasons.map(
                                                (reason, index) => (
                                                  <li key={`${submission.id}-reason-${index}`}>
                                                    {String(reason)}
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-xs theme-muted">No analysis details yet.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
