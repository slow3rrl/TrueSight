import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileArchive,
  FileImage,
  FileText,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { GlobalThemeToggle } from "../../components/theme/GlobalThemeToggle";
import {
  fetchDocumentPreview,
  type DocumentPreviewType,
} from "../../services/classService";
import {
  documentCanUseNativeFrame,
  formatFileSize,
  loadDraftDocument,
  type PreviewableDocument,
} from "../../utils/documentPreview";

const isPreviewType = (value?: string): value is DocumentPreviewType =>
  value === "activity-attachment" || value === "submission";

const getDocumentIcon = (document: PreviewableDocument) => {
  const type = document.fileType?.toLowerCase() ?? "";

  if (type.startsWith("image/")) {
    return FileImage;
  }

  if (type.includes("word") || document.fileName.toLowerCase().endsWith(".docx")) {
    return FileArchive;
  }

  return FileText;
};

const dataUrlToText = async (dataUrl: string | null): Promise<string | null> => {
  if (!dataUrl?.startsWith("data:text/")) {
    return null;
  }

  try {
    const response = await fetch(dataUrl);
    return await response.text();
  } catch {
    return null;
  }
};

export default function DocumentViewerPage() {
  const navigate = useNavigate();
  const { documentType, documentId } = useParams<{
    documentType: string;
    documentId: string;
  }>();

  const [document, setDocument] = useState<PreviewableDocument | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDocument = async () => {
      if (!documentType || !documentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setTextPreview(null);

      try {
        const payload =
          documentType === "draft"
            ? loadDraftDocument(documentId)
            : isPreviewType(documentType)
              ? await fetchDocumentPreview(documentType, documentId)
              : null;

        if (!active) {
          return;
        }

        if (!payload) {
          setDocument(null);
          return;
        }

        setDocument(payload);
        const textFromDataUrl = await dataUrlToText(payload.dataUrl);

        if (active) {
          setTextPreview(payload.textContent ?? textFromDataUrl);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load document.";
        toast.error(message);
        setDocument(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      active = false;
    };
  }, [documentId, documentType]);

  const Icon = useMemo(
    () => (document ? getDocumentIcon(document) : FileText),
    [document],
  );

  const nativeFrameSupported = document ? documentCanUseNativeFrame(document) : false;
  const isImage = document?.fileType?.toLowerCase().startsWith("image/") ?? false;
  const isPdf =
    document?.fileType?.toLowerCase() === "application/pdf" ||
    document?.fileName.toLowerCase().endsWith(".pdf") ||
    false;

  return (
    <div className="h-screen overflow-hidden bg-transparent text-[var(--app-text)]">
      <header className="fixed left-0 right-0 top-0 z-20 h-16 border-b theme-border bg-[color-mix(in_srgb,var(--app-bg)_72%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <GlobalThemeToggle className="h-10 w-10" />
        </div>
      </header>

      <main
        data-route-scroll-container
        className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-6xl">
        {loading ? (
          <Card className="theme-card">
            <CardContent className="flex items-center gap-3 p-6 text-sm theme-muted">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent)]" />
              Loading document preview...
            </CardContent>
          </Card>
        ) : !document ? (
          <Card className="theme-card">
            <CardContent className="p-6 text-sm theme-muted">
              Document not found or access denied.
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <Card className="theme-card overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] text-[var(--app-accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="theme-muted text-xs uppercase tracking-wide">
                        {document.kind === "activity-attachment"
                          ? "Activity Attachment"
                          : document.kind === "submission"
                            ? "Submission Document"
                            : "Draft Document"}
                      </p>
                      <h1 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                        {document.fileName}
                      </h1>
                      <p className="mt-1 text-sm theme-muted">{document.title}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm sm:min-w-56">
                    {document.className && (
                      <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] px-3 py-2">
                        <p className="text-xs theme-muted">Class</p>
                        <p className="font-medium text-[var(--app-text)]">{document.className}</p>
                      </div>
                    )}
                    <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] px-3 py-2">
                      <p className="text-xs theme-muted">File</p>
                      <p className="font-medium text-[var(--app-text)]">
                        {document.fileType ?? "Unknown type"} - {formatFileSize(document.fileSize)}
                      </p>
                    </div>
                    {document.submittedAt && (
                      <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_82%,transparent)] px-3 py-2">
                        <p className="text-xs theme-muted">Submitted</p>
                        <p className="font-medium text-[var(--app-text)]">
                          {new Date(document.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="theme-card overflow-hidden">
              <CardContent className="p-0">
                {isImage && document.dataUrl ? (
                  <div className="flex min-h-[60vh] items-center justify-center bg-black/30 p-4">
                    <img
                      src={document.dataUrl}
                      alt={document.fileName}
                      className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-[var(--app-shadow)]"
                    />
                  </div>
                ) : isPdf && document.dataUrl ? (
                  <iframe
                    title={document.fileName}
                    src={document.dataUrl}
                    className="h-[72vh] w-full border-0 bg-white"
                  />
                ) : textPreview ? (
                  <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-6 text-[var(--app-text)]">
                    {textPreview}
                  </pre>
                ) : nativeFrameSupported && document.dataUrl ? (
                  <iframe
                    title={document.fileName}
                    src={document.dataUrl}
                    className="h-[72vh] w-full border-0 bg-[var(--app-surface)]"
                  />
                ) : (
                  <div className="flex min-h-[52vh] items-center justify-center p-6">
                    <div className="max-w-md rounded-2xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_86%,transparent)] p-5 text-center">
                      <Icon className="mx-auto h-10 w-10 text-[var(--app-accent)]" />
                      <p className="mt-3 font-semibold text-[var(--app-text)]">
                        Preview stored for {document.fileName}
                      </p>
                      <p className="mt-2 text-sm theme-muted">
                        This format is preserved in-app. Native browser rendering may be limited
                        for Word documents.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        </div>
      </main>
    </div>
  );
}
