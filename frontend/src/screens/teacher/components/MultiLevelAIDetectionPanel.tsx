import {
  AlertTriangle,
  Gauge,
  ListChecks,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/Card";
import type {
  ClassSubmission,
  SubmissionAnalysisDetails,
  SuspiciousSentence,
} from "../services/teacherClassroomService";

type MultiLevelAIDetectionPanelProps = {
  submission: ClassSubmission;
  details: SubmissionAnalysisDetails | null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const deriveConfidenceLevel = (confidenceScore: number | null): string => {
  if (confidenceScore === null) {
    return "Unavailable";
  }

  if (confidenceScore >= 85) {
    return "Very High";
  }

  if (confidenceScore >= 72) {
    return "High";
  }

  if (confidenceScore >= 60) {
    return "Moderate";
  }

  return "Low";
};

const getConfidenceTone = (level: string): string => {
  const normalized = level.toLowerCase();

  if (normalized.includes("very high") || normalized === "high") {
    return "bg-emerald-500/20 text-emerald-300";
  }

  if (normalized === "moderate") {
    return "bg-amber-500/20 text-amber-300";
  }

  if (normalized === "low") {
    return "bg-rose-500/20 text-rose-300";
  }

  return "bg-[color-mix(in_srgb,var(--app-muted)_20%,transparent)] text-[var(--app-text)]";
};

const getSuspicionTone = (score: number): string => {
  if (score >= 80) {
    return "bg-rose-500";
  }

  if (score >= 65) {
    return "bg-amber-500";
  }

  return "bg-[var(--app-accent)]";
};

const parseSuspiciousSentences = (value: unknown): SuspiciousSentence[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const score = asNumber(candidate.aiSuspicionScore);
      const sentence = typeof candidate.sentence === "string" ? candidate.sentence : null;
      const sentenceNumber = asNumber(candidate.sentenceNumber);
      const reasons = Array.isArray(candidate.reasons)
        ? candidate.reasons.map((reason) => String(reason))
        : [];

      if (score === null || !sentence) {
        return null;
      }

      return {
        sentenceNumber: sentenceNumber !== null ? sentenceNumber : index + 1,
        sentence,
        aiSuspicionScore: score,
        reasons,
      };
    })
    .filter((item): item is SuspiciousSentence => item !== null);
};

const formatPercent = (value: number | null): string =>
  value === null ? "N/A" : `${value.toFixed(2)}%`;

export function MultiLevelAIDetectionPanel({
  submission,
  details,
}: MultiLevelAIDetectionPanelProps) {
  const confidenceScore =
    submission.confidenceScore ?? asNumber(details?.confidenceScore);
  const confidenceLevel =
    typeof details?.confidenceLevel === "string"
      ? details.confidenceLevel
      : deriveConfidenceLevel(confidenceScore);
  const writingConsistencyScore = asNumber(details?.writingConsistencyScore);
  const humanRevisionLikelihood = asNumber(details?.humanRevisionLikelihood);

  const suspiciousSentences = parseSuspiciousSentences(details?.suspiciousSentences)
    .filter((entry) => entry.aiSuspicionScore >= 56)
    .sort((left, right) => right.aiSuspicionScore - left.aiSuspicionScore)
    .slice(0, 6);

  return (
    <Card className="theme-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--app-text)]">
              Multi-Level AI Detection
            </h3>
            <p className="text-sm theme-muted">
              Deeper integrity scoring beyond a binary AI or human label.
            </p>
          </div>
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              getConfidenceTone(confidenceLevel),
            ].join(" ")}
          >
            {confidenceLevel} confidence
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <p className="text-xs theme-muted">AI Probability Score</p>
            <p className="mt-1 text-lg font-bold text-[var(--app-text)]">
              {formatPercent(submission.aiProbability)}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <p className="text-xs theme-muted">Confidence Score</p>
            <p className="mt-1 text-lg font-bold text-[var(--app-text)]">
              {formatPercent(confidenceScore)}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <p className="text-xs theme-muted">Writing Consistency Score</p>
            <p className="mt-1 text-lg font-bold text-[var(--app-text)]">
              {formatPercent(writingConsistencyScore)}
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <p className="text-xs theme-muted">Human Revision Likelihood</p>
            <p className="mt-1 text-lg font-bold text-[var(--app-text)]">
              {formatPercent(humanRevisionLikelihood)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="text-sm font-semibold text-[var(--app-text)]">
              Sentence-by-sentence suspicious sections
            </p>
          </div>

          {suspiciousSentences.length === 0 ? (
            <div className="rounded-lg border border-dashed theme-border p-3 text-sm theme-muted">
              No highly suspicious sentence sections were detected in this submission.
            </div>
          ) : (
            <div className="space-y-3">
              {suspiciousSentences.map((entry) => (
                <div
                  key={`${entry.sentenceNumber}-${entry.aiSuspicionScore}`}
                  className="rounded-lg border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_94%,transparent)] p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs theme-muted">
                    <span>Sentence {entry.sentenceNumber}</span>
                    <span>{entry.aiSuspicionScore.toFixed(2)}% suspicious</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--app-muted)_18%,transparent)]">
                    <div
                      className={`h-full ${getSuspicionTone(entry.aiSuspicionScore)}`}
                      style={{
                        width: `${Math.min(Math.max(entry.aiSuspicionScore, 0), 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[var(--app-text)]">{entry.sentence}</p>
                  {entry.reasons.length > 0 && (
                    <p className="mt-1 text-xs theme-muted">
                      Signals: {entry.reasons.join(" | ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[var(--app-accent)]" />
              <p className="text-xs theme-muted">Interpretation</p>
            </div>
            <p className="mt-1 text-sm text-[var(--app-text)]">
              Confidence level indicates how strongly the available signals support the AI
              probability estimate.
            </p>
          </div>
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
            <div className="flex items-center gap-2">
              {humanRevisionLikelihood !== null && humanRevisionLikelihood >= 55 ? (
                <UserRoundCheck className="h-4 w-4 text-emerald-300" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              )}
              <p className="text-xs theme-muted">Review Hint</p>
            </div>
            <p className="mt-1 text-sm text-[var(--app-text)]">
              {humanRevisionLikelihood !== null && humanRevisionLikelihood >= 55
                ? "Higher human-revision likelihood suggests manual editing signs are present."
                : "Lower human-revision likelihood suggests fewer manual editing markers."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="text-xs theme-muted">Current Verdict</p>
          </div>
          <p className="mt-1 font-semibold text-[var(--app-text)]">
            {typeof details?.verdict === "string" ? details.verdict : "No verdict yet"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
