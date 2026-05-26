type ExplainabilitySignal = {
  id: string;
  label: string;
  score: number;
  explanation: string;
};

type SuspiciousSentence = {
  sentenceNumber: number;
  sentence: string;
  aiSuspicionScore: number;
  reasons: string[];
};

type HighlightedToken = {
  token: string;
  aiProbability: number;
};

type AnalysisResult = {
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  isAIGenerated: boolean;
  details: Record<string, unknown>;
};

type TextStats = {
  cleanText: string;
  words: string[];
  sentences: string[];
  uniqueRatio: number;
  averageSentenceLength: number;
  sentenceStdDeviation: number;
  repetitionRatio: number;
  transitionDensity: number;
  formalSentenceRatio: number;
  contractionRatio: number;
};

type SaplingSentenceScore = {
  sentence?: unknown;
  score?: unknown;
};

type SaplingPayload = {
  score?: unknown;
  sentence_scores?: SaplingSentenceScore[];
  tokens?: unknown[];
  token_probs?: unknown[];
  text?: unknown;
  msg?: unknown;
};

const TRANSITION_PATTERN =
  /\b(however|therefore|moreover|furthermore|additionally|meanwhile|consequently|nonetheless|instead|for example|for instance|in contrast|as a result|in conclusion|on the other hand)\b/i;

const TEMPLATE_TRANSITION_OPENER_PATTERN =
  /^(moreover|furthermore|additionally|therefore|in conclusion|overall|to summarize|as a result)\b/i;

const clamp = (value: number, min = 0, max = 100): number => {
  return Math.min(max, Math.max(min, value));
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeProbability = (value: unknown): number | null => {
  const numeric = asNumber(value);
  if (numeric === null) return null;

  return clamp(Number((numeric <= 1 ? numeric * 100 : numeric).toFixed(2)));
};

const computeVariance = (values: number[]): number => {
  if (!values.length) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
};

const getConfidenceLevel = (score: number): string => {
  if (score >= 85) return "Very High";
  if (score >= 72) return "High";
  if (score >= 60) return "Moderate";
  return "Low";
};

const getRiskBand = (aiProbability: number): string => {
  if (aiProbability >= 80) return "High AI-likelihood";
  if (aiProbability >= 60) return "Elevated AI-likelihood";
  if (aiProbability >= 35) return "Mixed / needs review";
  return "Low AI-likelihood";
};

const extractSentences = (text: string): string[] => {
  const fromPunctuation = (text.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (fromPunctuation.length > 0) return fromPunctuation;

  return text
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

const extractStats = (text: string): TextStats => {
  const cleanText = String(text ?? "").trim();
  const lowered = cleanText.toLowerCase();
  const words = lowered.match(/\b[a-z0-9']+\b/g) ?? [];
  const sentences = extractSentences(cleanText);
  const uniqueRatio = words.length ? new Set(words).size / words.length : 1;
  const sentenceLengths = sentences.map(
    (sentence) => sentence.toLowerCase().match(/\b[a-z0-9']+\b/g)?.length ?? 0,
  );
  const averageSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, count) => sum + count, 0) / sentenceLengths.length
      : 0;
  const sentenceStdDeviation = Math.sqrt(computeVariance(sentenceLengths));
  const transitionDensity = sentences.length
    ? sentences.filter((sentence) => TRANSITION_PATTERN.test(sentence)).length / sentences.length
    : 0;
  const formalSentenceRatio = sentences.length
    ? sentences.filter((sentence) => {
        const trimmed = sentence.trim();
        return /^[A-Z]/.test(trimmed) && /[.!?]$/.test(trimmed);
      }).length / sentences.length
    : 0;
  const contractionRatio = words.length
    ? (cleanText.match(/\b\w+(?:n't|'re|'ve|'ll|'d|'m|'s)\b/gi)?.length ?? 0) / words.length
    : 0;

  let repetitionMatches = 0;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) repetitionMatches += 1;
  }

  return {
    cleanText,
    words,
    sentences,
    uniqueRatio,
    averageSentenceLength,
    sentenceStdDeviation,
    repetitionRatio: words.length ? repetitionMatches / words.length : 0,
    transitionDensity,
    formalSentenceRatio,
    contractionRatio,
  };
};

const buildExplainabilitySignals = (stats: TextStats): ExplainabilitySignal[] => {
  const repetitivePhrasingScore = clamp(
    Math.round((1 - stats.uniqueRatio) * 90 + stats.repetitionRatio * 420),
  );
  const roboticStructureScore = clamp(
    Math.round(
      ((18 - Math.min(stats.sentenceStdDeviation, 18)) / 18) * 72 +
        (stats.averageSentenceLength >= 16 && stats.averageSentenceLength <= 25 ? 18 : 6),
    ),
  );
  const unnaturalTransitionsScore = clamp(
    Math.round(
      (1 - Math.min(stats.transitionDensity, 1)) * 58 +
        (stats.averageSentenceLength > 22 ? 16 : 4),
    ),
  );
  const overPerfectGrammarScore = clamp(
    Math.round(
      stats.formalSentenceRatio * 68 +
        (stats.contractionRatio <= 0.005 ? 18 : 0) +
        (stats.sentenceStdDeviation < 4.5 ? 14 : 0),
    ),
  );

  return [
    {
      id: "repetitivePhrasing",
      label: "Repetitive phrasing",
      score: repetitivePhrasingScore,
      explanation:
        "Repeated vocabulary and neighboring terms can indicate machine-like wording reuse.",
    },
    {
      id: "roboticStructure",
      label: "Robotic structure",
      score: roboticStructureScore,
      explanation:
        "Very uniform sentence size and mirrored phrasing patterns can appear algorithmic.",
    },
    {
      id: "unnaturalTransitions",
      label: "Unnatural transitions",
      score: unnaturalTransitionsScore,
      explanation:
        "Abrupt sentence connections or template-style connectors can signal generated flow.",
    },
    {
      id: "overPerfectGrammar",
      label: "Over-perfect grammar",
      score: overPerfectGrammarScore,
      explanation:
        "Exceptionally polished grammar with little natural variation can be AI-leaning.",
    },
  ];
};

const scoreSuspiciousSentence = (
  sentence: string,
  index: number,
): SuspiciousSentence | null => {
  const lowered = sentence.toLowerCase();
  const words = lowered.match(/\b[a-z0-9']+\b/g) ?? [];

  if (!words.length) return null;

  const uniqueRatio = new Set(words).size / words.length;
  const reasons: string[] = [];
  let suspicionScore = 18;

  if (uniqueRatio < 0.62 && words.length >= 8) {
    suspicionScore += 20;
    reasons.push("Repetitive phrasing");
  }

  if (words.length >= 18 && words.length <= 28) {
    suspicionScore += 14;
    reasons.push("Very uniform sentence length");
  }

  if (TEMPLATE_TRANSITION_OPENER_PATTERN.test(lowered)) {
    suspicionScore += 16;
    reasons.push("Template-like transition opener");
  }

  if (!TRANSITION_PATTERN.test(lowered) && words.length >= 17) {
    suspicionScore += 10;
    reasons.push("Limited transition variety");
  }

  if (!/[!?]/.test(sentence) && /[,;:]/.test(sentence) && words.length >= 20) {
    suspicionScore += 10;
    reasons.push("Highly polished grammar pattern");
  }

  const score = clamp(Number(suspicionScore.toFixed(2)), 1, 100);

  return {
    sentenceNumber: index + 1,
    sentence,
    aiSuspicionScore: score,
    reasons,
  };
};

const buildHeuristicSuspiciousSentences = (stats: TextStats): SuspiciousSentence[] => {
  return stats.sentences
    .map((sentence, index) => scoreSuspiciousSentence(sentence, index))
    .filter((entry): entry is SuspiciousSentence => entry !== null)
    .filter((entry) => entry.aiSuspicionScore >= 56)
    .sort((left, right) => right.aiSuspicionScore - left.aiSuspicionScore)
    .slice(0, 8);
};

const buildProviderSuspiciousSentences = (
  sentenceScores: SaplingSentenceScore[] | undefined,
): SuspiciousSentence[] => {
  if (!Array.isArray(sentenceScores)) return [];

  return sentenceScores
    .map((entry, index) => {
      const sentence = typeof entry.sentence === "string" ? entry.sentence.trim() : "";
      const aiSuspicionScore = normalizeProbability(entry.score);

      if (!sentence || aiSuspicionScore === null) return null;

      const reasons = [
        aiSuspicionScore >= 75
          ? "Provider marked this sentence as highly AI-like"
          : "Provider marked this sentence as moderately AI-like",
      ];

      return {
        sentenceNumber: index + 1,
        sentence,
        aiSuspicionScore,
        reasons,
      };
    })
    .filter((entry): entry is SuspiciousSentence => entry !== null)
    .filter((entry) => entry.aiSuspicionScore >= 50)
    .sort((left, right) => right.aiSuspicionScore - left.aiSuspicionScore)
    .slice(0, 10);
};

const buildHighlightedTokens = (payload: SaplingPayload): HighlightedToken[] => {
  if (!Array.isArray(payload.tokens) || !Array.isArray(payload.token_probs)) {
    return [];
  }

  return payload.tokens
    .map((token, index) => {
      const aiProbability = normalizeProbability(payload.token_probs?.[index]);
      if (typeof token !== "string" || aiProbability === null) return null;

      return {
        token,
        aiProbability,
      };
    })
    .filter((entry): entry is HighlightedToken => entry !== null)
    .slice(0, 220);
};

const buildReasons = (
  stats: TextStats,
  suspiciousSentences: SuspiciousSentence[],
): string[] => {
  const reasons: string[] = [];

  if (stats.uniqueRatio < 0.55) {
    reasons.push("Low vocabulary variation detected across the submission.");
  }

  if (stats.averageSentenceLength > 22) {
    reasons.push("Sentences are unusually long and consistently structured.");
  }

  if (stats.sentenceStdDeviation < 4.5 && stats.sentences.length >= 4) {
    reasons.push("Sentence lengths are very uniform, which may indicate generated structure.");
  }

  if (stats.transitionDensity < 0.22 && stats.sentences.length >= 4) {
    reasons.push("Transitions between ideas appear formulaic or abrupt.");
  }

  if (suspiciousSentences.length > 0) {
    reasons.push("Sentence-level analysis found sections with elevated AI-likelihood.");
  }

  if (stats.words.length < 70) {
    reasons.push("Short content reduces confidence for AI detection.");
  }

  return reasons;
};

const buildBaseDetails = ({
  stats,
  source,
  provider,
  aiProbability,
  humanProbability,
  confidenceScore,
  suspiciousSentences,
  integrationStatus,
  highlightedTokens = [],
  providerFields = {},
}: {
  stats: TextStats;
  source: string;
  provider: string;
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  suspiciousSentences: SuspiciousSentence[];
  integrationStatus: Record<string, unknown>;
  highlightedTokens?: HighlightedToken[];
  providerFields?: Record<string, unknown>;
}): Record<string, unknown> => {
  const explainabilitySignals = buildExplainabilitySignals(stats);
  const overPerfectGrammarScore =
    explainabilitySignals.find((signal) => signal.id === "overPerfectGrammar")?.score ?? 0;
  const writingConsistencyScore = clamp(
    Math.round(
      100 -
        Math.min(45, stats.sentenceStdDeviation * 6) -
        Math.min(22, Math.max(0, 0.58 - stats.uniqueRatio) * 120) -
        Math.min(15, stats.repetitionRatio * 280),
    ),
  );
  const humanRevisionLikelihood = clamp(
    Math.round(
      humanProbability * 0.55 +
        writingConsistencyScore * 0.25 +
        (100 - overPerfectGrammarScore) * 0.2,
    ),
  );
  const confidenceLevel = getConfidenceLevel(confidenceScore);
  const verdict =
    aiProbability >= 60 ? "Likely AI-generated text" : "Likely human-written text";
  const reasons = buildReasons(stats, suspiciousSentences);

  return {
    detectorType: "text",
    source,
    provider,
    verdict,
    aiProbability,
    humanProbability,
    confidenceScore,
    confidenceLevel,
    riskBand: getRiskBand(aiProbability),
    writingConsistencyScore,
    humanRevisionLikelihood,
    reasons,
    suspiciousSentences,
    sentenceResults: suspiciousSentences,
    highlightedTokens,
    explainabilitySignals,
    scoreCards: [
      {
        id: "aiProbability",
        label: "AI probability",
        value: aiProbability,
        unit: "%",
        tone: aiProbability >= 60 ? "risk" : "calm",
        description: "Primary estimate that the text was generated or heavily assisted by AI.",
      },
      {
        id: "humanProbability",
        label: "Human probability",
        value: humanProbability,
        unit: "%",
        tone: humanProbability >= 60 ? "calm" : "risk",
        description: "Inverse estimate showing how much the text leans human-written.",
      },
      {
        id: "writingConsistency",
        label: "Writing consistency",
        value: writingConsistencyScore,
        unit: "%",
        tone: writingConsistencyScore >= 70 ? "warning" : "calm",
        description: "Higher values mean the writing rhythm is unusually consistent.",
      },
      {
        id: "humanRevision",
        label: "Human revision signs",
        value: humanRevisionLikelihood,
        unit: "%",
        tone: humanRevisionLikelihood >= 55 ? "calm" : "warning",
        description: "Estimated presence of natural revision and variation markers.",
      },
    ],
    analysisTimeline: [
      {
        label: "Text extraction",
        status: stats.cleanText ? "complete" : "needs-review",
        detail: `${stats.words.length} words and ${stats.sentences.length} sentences found.`,
      },
      {
        label: "Provider request",
        status: integrationStatus.liveProviderUsed ? "complete" : "fallback",
        detail: integrationStatus.message,
      },
      {
        label: "Sentence review",
        status: suspiciousSentences.length > 0 ? "needs-review" : "complete",
        detail:
          suspiciousSentences.length > 0
            ? `${suspiciousSentences.length} sentence sections need closer review.`
            : "No sentence sections crossed the review threshold.",
      },
    ],
    reviewChecklist: [
      {
        label: "Read the highlighted sentences in context",
        status: suspiciousSentences.length > 0 ? "recommended" : "optional",
      },
      {
        label: "Compare against drafts, citations, and class notes",
        status: "recommended",
      },
      {
        label: "Treat the score as a review signal, not standalone proof",
        status: "required",
      },
    ],
    metrics: {
      wordCount: stats.words.length,
      sentenceCount: stats.sentences.length,
      uniqueWordRatio: Number(stats.uniqueRatio.toFixed(3)),
      averageSentenceLength: Number(stats.averageSentenceLength.toFixed(2)),
      sentenceStdDeviation: Number(stats.sentenceStdDeviation.toFixed(2)),
      repetitionRatio: Number(stats.repetitionRatio.toFixed(3)),
      transitionDensity: Number(stats.transitionDensity.toFixed(3)),
      formalSentenceRatio: Number(stats.formalSentenceRatio.toFixed(3)),
      contractionRatio: Number(stats.contractionRatio.toFixed(4)),
    },
    integrationStatus,
    ...providerFields,
  };
};

const buildResult = (
  aiProbability: number,
  details: Record<string, unknown>,
): AnalysisResult => {
  const normalizedAiProbability = clamp(Number(aiProbability.toFixed(2)));
  const humanProbability = Number((100 - normalizedAiProbability).toFixed(2));
  const confidenceScore = Number(
    Math.max(normalizedAiProbability, humanProbability).toFixed(2),
  );

  return {
    aiProbability: normalizedAiProbability,
    humanProbability,
    confidenceScore,
    isAIGenerated: normalizedAiProbability >= 60,
    details: {
      ...details,
      aiProbability: normalizedAiProbability,
      humanProbability,
      confidenceScore,
      confidenceLevel: getConfidenceLevel(confidenceScore),
    },
  };
};

const runFallbackHeuristic = (
  text: string,
  warning?: string,
  source = "fallback-heuristic",
): AnalysisResult => {
  const stats = extractStats(text);

  if (!stats.cleanText || stats.words.length < 10) {
    return buildResult(0, {
      detectorType: "text",
      source,
      provider: "Fallback Heuristic",
      verdict: "Not enough readable text for reliable analysis",
      riskBand: "Insufficient text",
      reasons: ["The submitted content is too short or empty."],
      suspiciousSentences: [],
      sentenceResults: [],
      explainabilitySignals: buildExplainabilitySignals(stats),
      scoreCards: [],
      analysisTimeline: [
        {
          label: "Text extraction",
          status: "needs-review",
          detail: "Not enough readable words were found.",
        },
      ],
      reviewChecklist: [
        {
          label: "Ask for a text-readable submission or original document",
          status: "recommended",
        },
      ],
      metrics: {
        wordCount: stats.words.length,
        sentenceCount: stats.sentences.length,
      },
      integrationStatus: {
        providerConfigured: false,
        liveProviderUsed: false,
        fallbackUsed: true,
        message: warning ?? "Fallback analysis used because readable text was limited.",
      },
      warning,
    });
  }

  const suspiciousSentences = buildHeuristicSuspiciousSentences(stats);
  let score = 35;

  if (stats.uniqueRatio < 0.55) score += 20;
  if (stats.averageSentenceLength > 22) score += 15;
  if (
    stats.sentences.length >= 4 &&
    stats.averageSentenceLength >= 16 &&
    stats.averageSentenceLength <= 25
  ) {
    score += 10;
  }
  if (stats.transitionDensity < 0.22 && stats.sentences.length >= 4) score += 8;
  if (stats.sentenceStdDeviation < 4.5 && stats.sentences.length >= 4) score += 9;
  if (suspiciousSentences.length > 0) score += Math.min(12, suspiciousSentences.length * 2);
  if (stats.words.length < 70) score -= 8;

  const aiProbability = clamp(score);
  const humanProbability = Number((100 - aiProbability).toFixed(2));
  const confidenceScore = Number(Math.max(aiProbability, humanProbability).toFixed(2));

  return buildResult(
    aiProbability,
    buildBaseDetails({
      stats,
      source,
      provider: "Fallback Heuristic",
      aiProbability,
      humanProbability,
      confidenceScore,
      suspiciousSentences,
      integrationStatus: {
        providerConfigured: false,
        liveProviderUsed: false,
        fallbackUsed: true,
        message: warning ?? "Local fallback pattern analysis was used.",
      },
      providerFields: {
        warning,
      },
    }),
  );
};

const runDemoResult = (text: string): AnalysisResult => {
  const fallback = runFallbackHeuristic(text, undefined, "demo-mode");

  return {
    ...fallback,
    details: {
      ...fallback.details,
      provider: "Demo Mode",
      integrationStatus: {
        providerConfigured: false,
        liveProviderUsed: false,
        fallbackUsed: true,
        message: "Demo mode is active. Set DETECTION_PROVIDER=sapling to use your API key.",
      },
      note:
        "Demo Mode is used for capstone demonstration when no live provider is selected.",
    },
  };
};

const analyzeWithWinston = async (
  text: string,
  fallback: AnalysisResult,
): Promise<AnalysisResult> => {
  const apiKey = process.env.WINSTON_API_KEY;

  if (!apiKey) {
    return runFallbackHeuristic(text, "WINSTON_API_KEY is missing. Fallback analysis was used.");
  }

  if (text.length < 300) {
    return runFallbackHeuristic(
      text,
      "Winston AI requires longer text for reliable analysis. Fallback analysis was used.",
    );
  }

  try {
    const endpoint =
      process.env.WINSTON_API_URL ??
      "https://api.gowinston.ai/v2/ai-content-detection";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        version: process.env.WINSTON_API_VERSION ?? "latest",
        sentences: true,
        language: "auto",
      }),
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok || !payload) {
      return {
        ...fallback,
        details: {
          ...fallback.details,
          integrationStatus: {
            providerConfigured: true,
            liveProviderUsed: false,
            fallbackUsed: true,
            message: "Winston AI request failed. Fallback analysis was used.",
          },
          provider: "Fallback Heuristic",
          winstonStatus: response.status,
          winstonError: payload,
          warning: "Winston AI request failed. Fallback analysis was used.",
        },
      };
    }

    const aiProbability = normalizeProbability(payload.score);

    if (aiProbability === null) {
      return {
        ...fallback,
        details: {
          ...fallback.details,
          provider: "Fallback Heuristic",
          rawProviderResponse: payload,
          warning:
            "Winston AI response did not include a valid score. Fallback analysis was used.",
        },
      };
    }

    const humanProbability = Number((100 - aiProbability).toFixed(2));
    const confidenceScore = Number(Math.max(aiProbability, humanProbability).toFixed(2));
    const stats = extractStats(text);

    return buildResult(
      aiProbability,
      buildBaseDetails({
        stats,
        source: "winston-ai",
        provider: "Winston AI",
        aiProbability,
        humanProbability,
        confidenceScore,
        suspiciousSentences: buildHeuristicSuspiciousSentences(stats),
        integrationStatus: {
          providerConfigured: true,
          liveProviderUsed: true,
          fallbackUsed: false,
          message: "Winston AI returned a live provider score.",
        },
        providerFields: {
          creditsUsed: payload.credits_used,
          creditsRemaining: payload.credits_remaining,
          readabilityScore: payload.readability_score,
          language: payload.language,
          version: payload.version,
          attackDetected: payload.attack_detected,
        },
      }),
    );
  } catch (error) {
    return runFallbackHeuristic(
      text,
      `Winston AI request failed due to a server/network error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const analyzeWithSapling = async (
  text: string,
  fallback: AnalysisResult,
): Promise<AnalysisResult> => {
  const apiKey = process.env.SAPLING_API_KEY;

  if (!apiKey) {
    return runFallbackHeuristic(text, "SAPLING_API_KEY is missing. Fallback analysis was used.");
  }

  try {
    const endpoint =
      process.env.SAPLING_API_URL ?? "https://api.sapling.ai/api/v1/aidetect";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: apiKey,
        text,
        sent_scores: true,
        score_string: false,
        version: process.env.SAPLING_API_VERSION ?? "20251027",
      }),
    });

    clearTimeout(timeout);

    const payload = (await response.json().catch(() => null)) as SaplingPayload | null;

    if (!response.ok || !payload) {
      return {
        ...fallback,
        details: {
          ...fallback.details,
          integrationStatus: {
            providerConfigured: true,
            liveProviderUsed: false,
            fallbackUsed: true,
            message: "Sapling AI request failed. Fallback analysis was used.",
          },
          provider: "Fallback Heuristic",
          saplingStatus: response.status,
          saplingError: payload?.msg ?? payload,
          warning: "Sapling AI request failed. Fallback analysis was used.",
        },
      };
    }

    const aiProbability = normalizeProbability(payload.score);

    if (aiProbability === null) {
      return {
        ...fallback,
        details: {
          ...fallback.details,
          provider: "Fallback Heuristic",
          rawProviderResponse: payload,
          warning:
            "Sapling AI response did not include a valid score. Fallback analysis was used.",
        },
      };
    }

    const stats = extractStats(text);
    const humanProbability = Number((100 - aiProbability).toFixed(2));
    const confidenceScore = Number(Math.max(aiProbability, humanProbability).toFixed(2));
    const providerSuspiciousSentences = buildProviderSuspiciousSentences(
      payload.sentence_scores,
    );
    const heuristicSuspiciousSentences = buildHeuristicSuspiciousSentences(stats);
    const suspiciousSentences =
      providerSuspiciousSentences.length > 0
        ? providerSuspiciousSentences
        : heuristicSuspiciousSentences;

    return buildResult(
      aiProbability,
      buildBaseDetails({
        stats,
        source: "sapling-ai",
        provider: "Sapling AI Detector",
        aiProbability,
        humanProbability,
        confidenceScore,
        suspiciousSentences,
        highlightedTokens: buildHighlightedTokens(payload),
        integrationStatus: {
          providerConfigured: true,
          liveProviderUsed: true,
          fallbackUsed: false,
          message: "Sapling API key loaded from backend environment and used successfully.",
        },
        providerFields: {
          version: process.env.SAPLING_API_VERSION ?? "20251027",
          providerSentenceCount: Array.isArray(payload.sentence_scores)
            ? payload.sentence_scores.length
            : 0,
          tokenCount: Array.isArray(payload.tokens) ? payload.tokens.length : 0,
          providerScore: aiProbability,
          heuristicProbability: fallback.aiProbability,
        },
      }),
    );
  } catch (error) {
    return runFallbackHeuristic(
      text,
      `Sapling AI request failed due to a server/network error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const resolveProvider = (): string => {
  const configured = String(process.env.DETECTION_PROVIDER ?? "auto").toLowerCase();

  if (configured === "auto" || configured === "api") {
    if (process.env.SAPLING_API_KEY) return "sapling";
    if (process.env.WINSTON_API_KEY) return "winston";
    return "demo";
  }

  return configured;
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  const normalizedText = String(text ?? "").trim();

  if (!normalizedText) {
    return runFallbackHeuristic("");
  }

  const fallback = runFallbackHeuristic(normalizedText);
  const provider = resolveProvider();

  if (provider === "winston") {
    return analyzeWithWinston(normalizedText, fallback);
  }

  if (provider === "sapling") {
    return analyzeWithSapling(normalizedText, fallback);
  }

  if (provider === "demo") {
    return runDemoResult(normalizedText);
  }

  return runFallbackHeuristic(
    normalizedText,
    `Unknown DETECTION_PROVIDER: ${provider}. Fallback analysis was used.`,
  );
};
