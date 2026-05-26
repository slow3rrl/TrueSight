import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import {
  fetchActivityDetail,
  submitActivitySubmission,
  unsubmitActivitySubmission,
  type ActivityDetail,
} from "./services/studentClassroomService";
import {
  formatFileSize,
  prepareFileUpload,
  saveDraftDocument,
  type PreparedFileUpload,
} from "../../utils/documentPreview";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Not available";
};

const getSubmissionTypeLabel = (type: string) => {
  if (type === "image") return "Image";
  if (type === "file") return "File";
  return "Essay";
};

const getAcceptedFileTypes = (type: string) =>
  type === "image" ? ".png,.jpg,.jpeg,.webp" : ".pdf,.docx";

const getUploadHelpText = (type: string) =>
  type === "image"
    ? "PNG, JPG, JPEG, or WEBP images up to 5 MB."
    : "PDF or DOCX documents up to 5 MB.";

export default function StudentSubmissionPage() {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [essayContent, setEssayContent] = useState("");
  const [preparedUpload, setPreparedUpload] = useState<PreparedFileUpload | null>(null);
  const [draftPreviewId, setDraftPreviewId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPreparingFile, setIsPreparingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnsubmitting, setIsUnsubmitting] = useState(false);
  const [unsubmitDialogOpen, setUnsubmitDialogOpen] = useState(false);

  const activity = detail?.activity ?? null;
  const submission = detail?.mySubmission ?? null;
  const locked = Boolean(submission) && activity?.allowResubmission === false;

  const loadDetail = async () => {
    if (!activityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchActivityDetail(activityId);
      setDetail(payload);
      setEssayContent(payload.mySubmission?.contentText ?? "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load activity.";
      toast.error(message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const prepareSelectedFile = async (file: File | undefined) => {
    if (!file || !activity) {
      return;
    }

    setIsPreparingFile(true);
    setUploadProgress(0);

    try {
      const upload = await prepareFileUpload(
        file,
        setUploadProgress,
        activity.submissionType === "image"
          ? "image-submission"
          : "file-submission",
      );
      const previewId = saveDraftDocument(
        upload,
        activity.title,
        activity.className,
      );

      setPreparedUpload(upload);
      setDraftPreviewId(previewId);
      toast.success(
        activity.submissionType === "image"
          ? "Image ready for preview."
          : "File ready for preview.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to prepare file.";
      toast.error(message);
      setPreparedUpload(null);
      setDraftPreviewId(null);
      setUploadProgress(0);
    } finally {
      setIsPreparingFile(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void prepareSelectedFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    void prepareSelectedFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!activity || !activityId || locked) {
      return;
    }

    if (activity.submissionType === "essay" && !essayContent.trim()) {
      toast.error("Essay submission requires text content.");
      return;
    }

    if (activity.submissionType === "file" && !preparedUpload) {
      toast.error("Please upload a PDF or DOCX document first.");
      return;
    }

    if (activity.submissionType === "image" && !preparedUpload) {
      toast.error("Please upload a supported image first.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitActivitySubmission(activityId, {
        contentText:
          activity.submissionType === "essay" ? essayContent.trim() : undefined,
        fileName:
          activity.submissionType === "essay" ? undefined : preparedUpload?.fileName,
        fileType:
          activity.submissionType === "essay" ? undefined : preparedUpload?.fileType,
        fileSize:
          activity.submissionType === "essay" ? undefined : preparedUpload?.fileSize,
        fileDataUrl:
          activity.submissionType === "essay"
            ? undefined
            : preparedUpload?.fileDataUrl,
      });

      toast.success(submission ? "Submission updated." : "Submission saved.");
      navigate(`/student/classes/${activity.classId}/activities/${activity.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit work.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmUnsubmit = async () => {
    if (!activity || !activityId || !submission || locked || isUnsubmitting) {
      return;
    }

    setIsUnsubmitting(true);
    try {
      await unsubmitActivitySubmission(activityId);
      toast.success("Submission removed.");
      setUnsubmitDialogOpen(false);
      setPreparedUpload(null);
      setDraftPreviewId(null);
      await loadDetail();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unsubmit work.";
      toast.error(message);
    } finally {
      setIsUnsubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-transparent text-[var(--app-text)]">
      <header className="fixed left-0 right-0 top-0 z-20 h-16 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_72%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Button
            variant="outline"
            onClick={() =>
              activity
                ? navigate(`/student/classes/${activity.classId}/activities/${activity.id}`)
                : navigate("/student/student_screen")
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Activity
          </Button>
          <GlobalThemeToggle className="h-10 w-10" />
        </div>
      </header>

      <main
        data-route-scroll-container
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto px-4 py-6 pb-10 sm:px-6"
      >
        <div className="mx-auto max-w-6xl">
        {loading ? (
          <Card className="theme-card">
            <CardContent className="flex items-center gap-3 p-6 text-sm theme-muted">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent)]" />
              Loading submission workspace...
            </CardContent>
          </Card>
        ) : !activity ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Activity not found or access denied.
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-5 lg:grid-cols-[1fr_340px]"
          >
            <div className="space-y-5">
              <Card className="theme-card">
                <CardContent className="space-y-2 p-5">
                  <p className="theme-muted text-xs uppercase tracking-wide">
                    Submit Activity
                  </p>
                  <h1 className="text-3xl font-bold text-[var(--app-text)]">
                    {activity.title}
                  </h1>
                  <p className="text-sm theme-muted">
                    Due {formatDateTime(activity.dueDate)}
                  </p>
                </CardContent>
              </Card>

              <Card className="theme-card">
                <CardContent className="space-y-4 p-5">
                  {activity.submissionType === "essay" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[var(--app-text)]">
                        Essay Content
                      </label>
                      <textarea
                        value={essayContent}
                        onChange={(event) => setEssayContent(event.target.value)}
                        rows={14}
                        disabled={locked}
                        className="theme-ring w-full rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_86%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Write your response here..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input
                        ref={inputRef}
                        type="file"
                        accept={getAcceptedFileTypes(activity.submissionType)}
                        className="hidden"
                        onChange={handleFileInput}
                      />
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => inputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={[
                          "theme-ring flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-all",
                          dragActive
                            ? "border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)]"
                            : "theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] hover:border-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)]",
                          locked ? "cursor-not-allowed opacity-60" : "",
                        ].join(" ")}
                      >
                        {activity.submissionType === "image" ? (
                          <ImageIcon className="h-10 w-10 text-[var(--app-accent)]" />
                        ) : (
                          <UploadCloud className="h-10 w-10 text-[var(--app-accent)]" />
                        )}
                        <p className="mt-3 font-semibold text-[var(--app-text)]">
                          Drop your {getSubmissionTypeLabel(activity.submissionType).toLowerCase()} here
                        </p>
                        <p className="mt-1 max-w-sm text-sm theme-muted">
                          {getUploadHelpText(activity.submissionType)}
                        </p>
                      </button>

                      {isPreparingFile && (
                        <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] p-3">
                          <div className="mb-2 flex items-center justify-between text-xs theme-muted">
                            <span>Preparing preview</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--app-muted)_20%,transparent)]">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(135deg,var(--app-accent),var(--app-accent-2))] transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {preparedUpload && (
                        <div className="rounded-2xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              {activity.submissionType === "image" ? (
                                <ImageIcon className="h-5 w-5 text-[var(--app-accent)]" />
                              ) : (
                                <FileUp className="h-5 w-5 text-[var(--app-accent)]" />
                              )}
                              <div>
                                <p className="font-medium text-[var(--app-text)]">
                                  {preparedUpload.fileName}
                                </p>
                                <p className="text-xs theme-muted">
                                  {formatFileSize(preparedUpload.fileSize)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {draftPreviewId && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/documents/draft/${draftPreviewId}`)}
                                >
                                  Preview
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPreparedUpload(null);
                                  setDraftPreviewId(null);
                                  setUploadProgress(0);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-5">
              <Card className="theme-card">
                <CardContent className="space-y-3 p-5">
                  <h2 className="text-lg font-semibold text-[var(--app-text)]">
                    Status
                  </h2>
                  <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--app-accent)]" />
                      <p className="font-medium text-[var(--app-text)]">
                        {submission ? submission.status : "Not submitted"}
                      </p>
                    </div>
                    <p className="mt-2 text-xs theme-muted">
                      {submission
                        ? `Submitted ${formatDateTime(submission.submittedAt)}`
                        : "No submission timestamp yet."}
                    </p>
                    {submission?.fileName && (
                      <p className="mt-2 text-xs theme-muted">
                        {submission.fileName} - {formatFileSize(submission.fileSize)}
                      </p>
                    )}
                  </div>

                  {submission && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => navigate(`/documents/submission/${submission.id}`)}
                    >
                      Preview Submitted Work
                    </Button>
                  )}
                </CardContent>
              </Card>

              {locked && (
                <Card className="theme-card">
                  <CardContent className="p-5 text-sm theme-muted">
                    This activity is locked because the teacher disabled resubmissions.
                  </CardContent>
                </Card>
              )}

              <Card className="theme-card">
                <CardContent className="space-y-3 p-5">
                  <Button
                    className="w-full"
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting || isPreparingFile || locked}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {submission ? "Submit Changes" : "Submit Work"}
                  </Button>
                  {submission && (
                    <AlertDialog
                      open={unsubmitDialogOpen}
                      onOpenChange={(open) => {
                        if (!isUnsubmitting) {
                          setUnsubmitDialogOpen(open);
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          className="w-full"
                          variant="destructive"
                          disabled={isUnsubmitting || locked}
                        >
                          {isUnsubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Unsubmit Work
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="theme-card border theme-border bg-[var(--app-surface)] text-[var(--app-text)]">
                        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                          <AlertDialogTitle>
                            Are you sure you want to unsubmit?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="theme-muted">
                            This will remove your current submitted work for{" "}
                            <span className="font-medium text-[var(--app-text)]">
                              {activity.title}
                            </span>
                            . You can submit again only if this activity still allows
                            resubmission.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] p-3 text-sm">
                          <p className="font-medium text-[var(--app-text)]">
                            Version {submission.submittedVersion}
                          </p>
                          <p className="mt-1 theme-muted">
                            Submitted {formatDateTime(submission.submittedAt)}
                          </p>
                          {submission.fileName && (
                            <p className="mt-1 theme-muted">
                              {submission.fileName} -{" "}
                              {formatFileSize(submission.fileSize)}
                            </p>
                          )}
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isUnsubmitting}>
                            Keep Submission
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isUnsubmitting}
                            onClick={(event) => {
                              event.preventDefault();
                              void handleConfirmUnsubmit();
                            }}
                            className="bg-rose-600 text-white hover:bg-rose-700"
                          >
                            {isUnsubmitting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Yes, Unsubmit
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            </aside>
          </motion.div>
        )}
        </div>
      </main>
    </div>
  );
}
