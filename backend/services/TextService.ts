type AnalysisResult = {
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  isAIGenerated: boolean;
  details: Record<string, unknown>;
};

const clamp = (value: number, min = 0, max = 100): number => {
  return Math.min(max, Math.max(min, value));
};

const getConfidenceLevel = (score: number): string => {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  return "Low";
};

const extractProbability = (payload: any): number | null => {
  const candidates = [
    payload?.documents?.[0]?.completely_generated_prob,
    payload?.documents?.[0]?.average_generated_prob,
    payload?.documents?.[0]?.ai_probability,
    payload?.ai_probability,
    payload?.probability,
    payload?.score,
  ];

  for (const value of candidates) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric <= 1 ? numeric * 100 : numeric;
    }
  }

  return null;
};

const runFallbackHeuristic = (text: string): AnalysisResult => {
  const cleanText = text.trim();
  const words = cleanText.match(/\b[\w']+\b/g) ?? [];
  const sentences = cleanText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!cleanText || words.length < 10) {
    return {
      aiProbability: 0,
      humanProbability: 100,
      confidenceScore: 0,
      isAIGenerated: false,
      details: {
        detectorType: "text",
        source: "fallback-heuristic",
        verdict: "Not enough readable text for reliable analysis",
        reasons: ["The submitted content is too short or empty."],
      },
    };
  }

  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
  const uniqueRatio = uniqueWords.size / words.length;

  const averageSentenceLength =
    sentences.length > 0 ? words.length / sentences.length : words.length;

  let score = 35;
  const reasons: string[] = [];

  if (uniqueRatio < 0.55) {
    score += 20;
    reasons.push("Low vocabulary variation detected.");
  }

  if (averageSentenceLength > 22) {
    score += 15;
    reasons.push("Sentences are unusually long and structured.");
  }

  if (sentences.length >= 4 && averageSentenceLength >= 16 && averageSentenceLength <= 25) {
    score += 10;
    reasons.push("Writing pattern appears highly consistent.");
  }

  if (!/[!?]/.test(cleanText) && sentences.length >= 4) {
    score += 8;
    reasons.push("Limited natural expression variation detected.");
  }

  score = clamp(score);

  const humanProbability = Number((100 - score).toFixed(2));

  return {
    aiProbability: Number(score.toFixed(2)),
    humanProbability,
    confidenceScore: Number(Math.max(score, humanProbability).toFixed(2)),
    isAIGenerated: score >= 60,
    details: {
      detectorType: "text",
      source: "fallback-heuristic",
      verdict: score >= 60 ? "Likely AI-generated" : "Likely human-written",
      reasons,
      metrics: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        uniqueWordRatio: Number(uniqueRatio.toFixed(3)),
        averageSentenceLength: Number(averageSentenceLength.toFixed(2)),
      },
      confidenceLevel: getConfidenceLevel(Math.max(score, humanProbability)),
    },
  };
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  const normalizedText = String(text ?? "").trim();

  if (!normalizedText) {
    return runFallbackHeuristic("");
  }

  const fallback = runFallbackHeuristic(normalizedText);
  const apiKey = process.env.GPTZERO_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const endpoint =
      process.env.GPTZERO_API_URL ?? "https://api.gptzero.me/v2/predict/text";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        document: normalizedText,
        version: "2024-01-09",
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const gptZeroProbability = extractProbability(payload);

    if (gptZeroProbability === null) {
      return fallback;
    }

    const blendedProbability = clamp(
      Number((gptZeroProbability * 0.75 + fallback.aiProbability * 0.25).toFixed(2)),
    );

    const humanProbability = Number((100 - blendedProbability).toFixed(2));
    const confidenceScore = Number(
      Math.max(blendedProbability, humanProbability).toFixed(2),
    );

    return {
      aiProbability: blendedProbability,
      humanProbability,
      confidenceScore,
      isAIGenerated: blendedProbability >= 60,
      details: {
        detectorType: "text",
        source: "gptzero+fallback-heuristic",
        verdict:
          blendedProbability >= 60
            ? "Likely AI-generated text"
            : "Likely human-written text",
        aiProbability: blendedProbability,
        humanProbability,
        confidenceScore,
        confidenceLevel: getConfidenceLevel(confidenceScore),
        gptzeroProbability: Number(gptZeroProbability.toFixed(2)),
        fallbackHeuristicProbability: fallback.aiProbability,
        reasons: [
          `GPTZero estimated ${Number(gptZeroProbability).toFixed(2)}% AI probability.`,
          ...((fallback.details.reasons as string[]) ?? []),
        ],
        rawProvider: "GPTZero",
      },
    };
  } catch {
    return fallback;
  }
};