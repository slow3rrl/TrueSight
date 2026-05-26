import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Gauge,
  Image,
  Layers,
  ListChecks,
  ListTodo,
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

type ScoreCard = {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  tone?: string;
  description?: string;
};

type TimelineStep = {
  label: string;
  status: string;
  detail: string;
};

type ReviewChecklistItem = {
  label: string;
  status: string;
};

type ClassProbability = {
  label: string;
  probability: number;
};

type HighlightedToken = {
  token: string;
  aiProbability: number;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const deriveConfidenceLevel = (confidenceScore: number | null): string => {
  if (confidenceScore === null) return "Unavailable";
  if (confidenceScore >= 85) return "Very High";
  if (confidenceScore >= 72) return "High";
  if (confidenceScore >= 60) return "Moderate";
  return "Low";
};

const getConfidenceTone = (level: string): string => {
  const normalized = level.toLowerCase();

  if (normalized.includes("very high") || normalized === "high") {
    return "bg-emerald-500/20 text-emerald-300";
  }

  if (normalized === "moderate") return "bg-amber-500/20 text-amber-300";
  if (normalized === "low") return "bg-rose-500/20 text-rose-300";

  return "bg-[color-mix(in_srgb,var(--app-muted)_20%,transparent)] text-[var(--app-text)]";
};

const getSuspicionTone = (score: number): string => {
  if (score >= 80) return "bg-rose-500";
  if (score >= 65) return "bg-amber-500";
  return "bg-[var(--app-accent)]";
};

const getCardTone = (tone?: string): string => {
  if (tone === "risk") return "border-rose-500/35 bg-rose-500/10";
  if (tone === "warning") return "border-amber-500/35 bg-amber-500/10";
  if (tone === "calm") return "border-emerald-500/35 bg-emerald-500/10";
  return "theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)]";
};

const getStepTone = (status: string): string => {
  if (status === "complete") return "bg-emerald-500";
  if (status === "fallback") return "bg-amber-500";
  return "bg-rose-500";
};

const getTokenTone = (score: number): string => {
  if (score >= 75) return "rgba(244, 63, 94, 0.28)";
  if (score >= 50) return "rgba(245, 158, 11, 0.26)";
  return "rgba(16, 185, 129, 0.18)";
};

const parseSuspiciousSentences = (value: unknown): SuspiciousSentence[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const score = asNumber(candidate.aiSuspicionScore);
      const sentence = typeof candidate.sentence === "string" ? candidate.sentence : null;
      const sentenceNumber = asNumber(candidate.sentenceNumber);
      const reasons = Array.isArray(candidate.reasons)
        ? candidate.reasons.map((reason) => String(reason))
        : [];

      if (score === null || !sentence) return null;

      return {
        sentenceNumber: sentenceNumber !== null ? sentenceNumber : index + 1,
        sentence,
        aiSuspicionScore: score,
        reasons,
      };
    })
    .filter((item): item is SuspiciousSentence => item !== null);
};

const parseScoreCards = (value: unknown): ScoreCard[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const id = typeof candidate.id === "string" ? candidate.id : null;
      const label = typeof candidate.label === "string" ? candidate.label : null;
      const numericValue = asNumber(candidate.value);
      const value =
        numericValue !== null
          ? numericValue
          : typeof candidate.value === "string"
            ? candidate.value
            : null;

      if (!id || !label || value === null) return null;

      const card: ScoreCard = {
        id,
        label,
        value,
        unit: typeof candidate.unit === "string" ? candidate.unit : "",
        tone: typeof candidate.tone === "string" ? candidate.tone : "neutral",
      };

      if (typeof candidate.description === "string") {
        card.description = candidate.description;
      }

      return card;
    })
    .filter((item): item is ScoreCard => item !== null);
};

const parseTimeline = (value: unknown): TimelineStep[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const label = typeof candidate.label === "string" ? candidate.label : null;
      const status = typeof candidate.status === "string" ? candidate.status : null;
      const detail = typeof candidate.detail === "string" ? candidate.detail : null;

      if (!label || !status || !detail) return null;

      return { label, status, detail };
    })
    .filter((item): item is TimelineStep => item !== null);
};

const parseChecklist = (value: unknown): ReviewChecklistItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const label = typeof candidate.label === "string" ? candidate.label : null;
      const status = typeof candidate.status === "string" ? candidate.status : null;

      if (!label || !status) return null;

      return { label, status };
    })
    .filter((item): item is ReviewChecklistItem => item !== null);
};

const parseClassProbabilities = (value: unknown): ClassProbability[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const label = typeof candidate.label === "string" ? candidate.label : null;
      const probability = asNumber(candidate.probability);

      if (!label || probability === null) return null;

      return { label, probability };
    })
    .filter((item): item is ClassProbability => item !== null)
    .sort((left, right) => right.probability - left.probability);
};

const parseHighlightedTokens = (value: unknown): HighlightedToken[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const candidate = item as Record<string, unknown>;
      const token = typeof candidate.token === "string" ? candidate.token : null;
      const aiProbability = asNumber(candidate.aiProbability);

      if (token === null || aiProbability === null) return null;

      return { token, aiProbability };
    })
    .filter((item): item is HighlightedToken => item !== null);
};

const formatScoreCardValue = (card: ScoreCard): string => {
  if (typeof card.value === "number") {
    return `${card.value.toFixed(card.unit === "%" ? 2 : 0)}${card.unit ?? ""}`;
  }

  return `${card.value}${card.unit ?? ""}`;
};

export function MultiLevelAIDetectionPanel({
  submission,
  details,
}: MultiLevelAIDetectionPanelProps) {
  const [activeView, setActiveView] = useState<
    "overview" | "evidence" | "tokens" | "checklist"
  >("overview");

  const confidenceScore =
    submission.confidenceScore ?? asNumber(details?.confidenceScore);
  const confidenceLevel =
    typeof details?.confidenceLevel === "string"
      ? details.confidenceLevel
      : deriveConfidenceLevel(confidenceScore);
  const writingConsistencyScore = asNumber(details?.writingConsistencyScore);
  const humanRevisionLikelihood = asNumber(details?.humanRevisionLikelihood);
  const detectorType =
    typeof details?.detectorType === "string" ? details.detectorType : "text";
  const provider = typeof details?.provider === "string" ? details.provider : "Detector";
  const riskBand = typeof details?.riskBand === "string" ? details.riskBand : null;
  const integrationStatus =
    typeof details?.integrationStatus === "object" && details.integrationStatus !== null
      ? (details.integrationStatus as Record<string, unknown>)
      : null;

  const suspiciousSentences = parseSuspiciousSentences(details?.suspiciousSentences)
    .filter((entry) => entry.aiSuspicionScore >= 56)
    .sort((left, right) => right.aiSuspicionScore - left.aiSuspicionScore)
    .slice(0, 6);
  const scoreCards = parseScoreCards(details?.scoreCards);
  const timeline = parseTimeline(details?.analysisTimeline);
  const checklist = parseChecklist(details?.reviewChecklist);
  const classProbabilities = parseClassProbabilities(details?.classProbabilities);
  const highlightedTokens = parseHighlightedTokens(details?.highlightedTokens);
  const imageProfile =
    typeof details?.imageProfile === "object" && details.imageProfile !== null
      ? (details.imageProfile as Record<string, unknown>)
      : null;

  const fallbackScoreCards: ScoreCard[] = [
    {
      id: "aiProbability",
      label: "AI probability",
      value: submission.aiProbability ?? 0,
      unit: "%",
      tone: (submission.aiProbability ?? 0) >= 60 ? "risk" : "calm",
    },
    {
      id: "confidenceScore",
      label: "Confidence score",
      value: confidenceScore ?? 0,
      unit: "%",
      tone: (confidenceScore ?? 0) >= 72 ? "calm" : "warning",
    },
    {
      id: "writingConsistencyScore",
      label: "Writing consistency",
      value: writingConsistencyScore ?? 0,
      unit: "%",
      tone: (writingConsistencyScore ?? 0) >= 70 ? "warning" : "calm",
    },
    {
      id: "humanRevisionLikelihood",
      label: "Human revision signs",
      value: humanRevisionLikelihood ?? 0,
      unit: "%",
      tone: (humanRevisionLikelihood ?? 0) >= 55 ? "calm" : "warning",
    },
  ];
  const visibleScoreCards = scoreCards.length > 0 ? scoreCards : fallbackScoreCards;
  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    {
      id: "evidence",
      label: detectorType === "image" ? "Classes" : "Sentences",
      icon: Layers,
    },
    {
      id: "tokens",
      label: detectorType === "image" ? "Profile" : "Tokens",
      icon: detectorType === "image" ? Image : FileText,
    },
    { id: "checklist", label: "Review", icon: ListTodo },
  ] as const;

  return (
    <Card className="theme-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--app-text)]">
              Interactive AI Analysis
            </h3>
            <p className="text-sm theme-muted">
              {provider} report with evidence, status, and teacher review steps.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {riskBand && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--app-accent)]">
                {riskBand}
              </span>
            )}
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                getConfidenceTone(confidenceLevel),
              ].join(" ")}
            >
              {confidenceLevel} confidence
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleScoreCards.map((card) => (
            <div
              key={card.id}
              className={["rounded-xl border p-3", getCardTone(card.tone)].join(" ")}
            >
              <p className="text-xs theme-muted">{card.label}</p>
              <p className="mt-1 break-words text-lg font-bold text-[var(--app-text)]">
                {formatScoreCardValue(card)}
              </p>
              {card.description && (
                <p className="mt-1 text-xs theme-muted">{card.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_80%,transparent)] p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeView === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={[
                  "inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                  selected
                    ? "bg-[var(--app-accent)] text-white"
                    : "text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] hover:text-[var(--app-text)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeView === "overview" && (
          <>
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--app-accent)]" />
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    Current Verdict
                  </p>
                </div>
                <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                  {typeof details?.verdict === "string"
                    ? details.verdict
                    : "No verdict yet"}
                </p>
                {integrationStatus && (
                  <p className="mt-2 text-sm theme-muted">
                    {String(integrationStatus.message ?? "Integration status unavailable.")}
                  </p>
                )}
              </div>

              <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-[var(--app-accent)]" />
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    Processing Timeline
                  </p>
                </div>
                {timeline.length === 0 ? (
                  <p className="mt-2 text-sm theme-muted">
                    No processing timeline was returned.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {timeline.map((step) => (
                      <div key={`${step.label}-${step.status}`} className="flex gap-3">
                        <span
                          className={[
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                            getStepTone(step.status),
                          ].join(" ")}
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--app-text)]">
                            {step.label}
                          </p>
                          <p className="text-xs theme-muted">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-[var(--app-accent)]" />
                  <p className="text-xs theme-muted">Interpretation</p>
                </div>
                <p className="mt-1 text-sm text-[var(--app-text)]">
                  Confidence level indicates how strongly the available signals support
                  the AI probability estimate.
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
                  {detectorType === "image"
                    ? "Image results should be reviewed alongside the uploaded image and assignment context."
                    : humanRevisionLikelihood !== null && humanRevisionLikelihood >= 55
                      ? "Higher human-revision likelihood suggests manual editing signs are present."
                      : "Lower human-revision likelihood suggests fewer manual editing markers."}
                </p>
              </div>
            </div>
          </>
        )}

        {activeView === "evidence" && (
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[var(--app-accent)]" />
              <p className="text-sm font-semibold text-[var(--app-text)]">
                {detectorType === "image"
                  ? "Image class probability evidence"
                  : "Sentence-by-sentence suspicious sections"}
              </p>
            </div>

            {detectorType === "image" ? (
              classProbabilities.length === 0 ? (
                <div className="rounded-lg border border-dashed theme-border p-3 text-sm theme-muted">
                  No class probabilities were returned. Add a configured image model to
                  enable model-backed image analysis.
                </div>
              ) : (
                <div className="space-y-3">
                  {classProbabilities.map((entry) => (
                    <div key={entry.label} className="rounded-lg border theme-border p-3">
                      <div className="flex items-center justify-between gap-3 text-xs theme-muted">
                        <span>{entry.label}</span>
                        <span>{entry.probability.toFixed(2)}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--app-muted)_18%,transparent)]">
                        <div
                          className={`h-full ${getSuspicionTone(entry.probability)}`}
                          style={{
                            width: `${Math.min(Math.max(entry.probability, 0), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : suspiciousSentences.length === 0 ? (
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
                    <p className="mt-2 text-sm text-[var(--app-text)]">
                      {entry.sentence}
                    </p>
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
        )}

        {activeView === "tokens" && (
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
            <div className="mb-3 flex items-center gap-2">
              {detectorType === "image" ? (
                <Image className="h-4 w-4 text-[var(--app-accent)]" />
              ) : (
                <FileText className="h-4 w-4 text-[var(--app-accent)]" />
              )}
              <p className="text-sm font-semibold text-[var(--app-text)]">
                {detectorType === "image" ? "Image technical profile" : "Token heatmap"}
              </p>
            </div>

            {detectorType === "image" ? (
              !imageProfile ? (
                <div className="rounded-lg border border-dashed theme-border p-3 text-sm theme-muted">
                  Image metadata was unavailable for this run.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(imageProfile).map(([key, value]) => (
                    <div key={key} className="rounded-lg border theme-border p-3">
                      <p className="text-xs uppercase tracking-wide theme-muted">{key}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-[var(--app-text)]">
                        {typeof value === "object" && value !== null
                          ? JSON.stringify(value)
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : highlightedTokens.length === 0 ? (
              <div className="rounded-lg border border-dashed theme-border p-3 text-sm theme-muted">
                Token-level heatmap data was not returned for this run.
              </div>
            ) : (
              <div className="rounded-lg border theme-border bg-[color-mix(in_srgb,var(--app-surface-strong)_94%,transparent)] p-3 text-sm leading-7 text-[var(--app-text)]">
                {highlightedTokens.map((entry, index) => (
                  <span
                    key={`${entry.token}-${index}`}
                    title={`${entry.aiProbability.toFixed(2)}% AI probability`}
                    className="rounded px-0.5"
                    style={{ backgroundColor: getTokenTone(entry.aiProbability) }}
                  >
                    {entry.token}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === "checklist" && (
          <div className="rounded-xl border theme-border bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-[var(--app-accent)]" />
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Teacher review checklist
              </p>
            </div>
            {checklist.length === 0 ? (
              <p className="text-sm theme-muted">No review checklist was returned.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={`${item.label}-${item.status}`}
                    className="flex items-start justify-between gap-3 rounded-lg border theme-border p-3"
                  >
                    <span className="text-sm text-[var(--app-text)]">{item.label}</span>
                    <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--app-accent)]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
