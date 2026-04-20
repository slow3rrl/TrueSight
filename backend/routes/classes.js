import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const router = express.Router();

let schemaReady = false;

const ensureClassroomSchema = async () => {
  if (schemaReady) return;

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_count INTEGER NOT NULL DEFAULT 0,
      assignment_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_enrollments (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(class_id, student_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      instructor VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      submission_type VARCHAR(20) NOT NULL CHECK (submission_type IN ('essay', 'file')),
      due_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_text TEXT,
      file_name VARCHAR(255),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      ai_probability NUMERIC(5,2),
      is_ai_generated BOOLEAN,
      analysis_details JSONB,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(activity_id, student_id)
    )
  `);

  schemaReady = true;
};

const protect = async (req, res, next) => {
  try {
    await ensureClassroomSchema();

    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Not authorized. No token found." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await pool.query(
      "SELECT id, name, email, role, profile_image_url FROM users WHERE id = $1",
      [decoded.id],
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user.rows[0];
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computeVariance = (values) => {
  if (!values.length) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return variance;
};

const average = (values) => {
  if (!values.length) {
    return null;
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return Number((sum / values.length).toFixed(2));
};

const deriveConfidenceLevel = (confidenceScore) => {
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

const TRANSITION_PATTERN =
  /\b(however|therefore|moreover|furthermore|additionally|meanwhile|consequently|nonetheless|instead|for example|for instance|in contrast|as a result|in conclusion|on the other hand)\b/i;

const TEMPLATE_TRANSITION_OPENER_PATTERN =
  /^(moreover|furthermore|additionally|therefore|in conclusion|overall|to summarize|as a result)\b/i;

const extractSentences = (text) => {
  const fromPunctuation = (String(text).match(/[^.!?]+[.!?]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (fromPunctuation.length > 0) {
    return fromPunctuation;
  }

  return String(text)
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

const scoreSuspiciousSentence = (sentence, index) => {
  const lowered = sentence.toLowerCase();
  const words = lowered.match(/\b[a-z0-9']+\b/g) ?? [];

  if (!words.length) {
    return null;
  }

  const uniqueRatio = new Set(words).size / words.length;
  const reasons = [];
  let suspicionScore = 20;

  let repeatedNeighbors = 0;
  for (let position = 1; position < words.length; position += 1) {
    if (words[position] === words[position - 1]) {
      repeatedNeighbors += 1;
    }
  }

  const repeatedNeighborRatio = words.length
    ? repeatedNeighbors / words.length
    : 0;

  if (uniqueRatio < 0.62 && words.length >= 8) {
    suspicionScore += 20;
    reasons.push("Repetitive phrasing");
  }

  if (words.length >= 18 && words.length <= 28) {
    suspicionScore += 12;
    reasons.push("Robotic sentence structure");
  }

  if (repeatedNeighborRatio > 0.03) {
    suspicionScore += 16;
    reasons.push("Repeated neighboring words");
  }

  if (TEMPLATE_TRANSITION_OPENER_PATTERN.test(lowered)) {
    suspicionScore += 14;
    reasons.push("Template-like transition opener");
  }

  if (!TRANSITION_PATTERN.test(lowered) && words.length >= 17) {
    suspicionScore += 8;
    reasons.push("Unnatural transition cue");
  }

  if (!/[!?]/.test(sentence) && /[,;:]/.test(sentence) && words.length >= 20) {
    suspicionScore += 10;
    reasons.push("Over-perfect grammar pattern");
  }

  const score = Number(clamp(Math.round(suspicionScore), 1, 100).toFixed(2));

  return {
    sentenceNumber: index + 1,
    sentence,
    aiSuspicionScore: score,
    reasons,
  };
};

const buildExplainabilitySignals = ({
  uniqueRatio,
  repetitionRatio,
  sentenceLengthStdDeviation,
  averageSentenceLength,
  transitionDensity,
  repeatedOpenerRatio,
  formalSentenceRatio,
  contractionRatio,
}) => {
  const repetitivePhrasingScore = clamp(
    Math.round((1 - uniqueRatio) * 90 + repetitionRatio * 420),
    0,
    100,
  );

  const roboticStructureScore = clamp(
    Math.round(
      ((18 - Math.min(sentenceLengthStdDeviation, 18)) / 18) * 70 +
        (averageSentenceLength >= 16 && averageSentenceLength <= 25 ? 20 : 8) +
        (repeatedOpenerRatio > 0.15 ? 10 : 0),
    ),
    0,
    100,
  );

  const unnaturalTransitionsScore = clamp(
    Math.round(
      (1 - Math.min(transitionDensity, 1)) * 60 +
        repeatedOpenerRatio * 30 +
        (averageSentenceLength > 22 ? 10 : 0),
    ),
    0,
    100,
  );

  const overPerfectGrammarScore = clamp(
    Math.round(
      formalSentenceRatio * 70 +
        (contractionRatio <= 0.005 ? 20 : 0) +
        (sentenceLengthStdDeviation < 4.5 ? 10 : 0),
    ),
    0,
    100,
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

const runHeuristicAnalysis = (text) => {
  const rawText = String(text ?? "");
  const normalized = rawText.trim().toLowerCase();

  if (!normalized) {
    return {
      probability: 0,
      isAIGenerated: false,
      details: {
        source: "system",
        verdict: "No readable text found for analysis",
        confidenceLevel: "Low",
        writingConsistencyScore: 0,
        humanRevisionLikelihood: 0,
        suspiciousSentences: [],
        explainabilitySignals: [
          {
            id: "repetitivePhrasing",
            label: "Repetitive phrasing",
            score: 0,
            explanation: "No text available for pattern scoring.",
          },
          {
            id: "roboticStructure",
            label: "Robotic structure",
            score: 0,
            explanation: "No text available for pattern scoring.",
          },
          {
            id: "unnaturalTransitions",
            label: "Unnatural transitions",
            score: 0,
            explanation: "No text available for pattern scoring.",
          },
          {
            id: "overPerfectGrammar",
            label: "Over-perfect grammar",
            score: 0,
            explanation: "No text available for pattern scoring.",
          },
        ],
        reasons: [
          "This submission appears to be file-only with no extracted text.",
          "Upload a text body to run confidence scoring.",
        ],
        metrics: {
          wordCount: 0,
          uniqueWordRatio: 0,
          averageSentenceLength: 0,
          sentenceVariance: 0,
          sentenceStdDeviation: 0,
          repetitionRatio: 0,
          transitionDensity: 0,
          repeatedOpenerRatio: 0,
          formalSentenceRatio: 0,
          contractionRatio: 0,
        },
      },
    };
  }

  const sentences = extractSentences(rawText);
  const words = normalized.match(/\b[a-z0-9']+\b/g) ?? [];
  const loweredSentences = sentences.map((sentence) => sentence.toLowerCase());

  const wordCount = words.length;
  const uniqueWordCount = new Set(words).size;
  const uniqueRatio = wordCount ? uniqueWordCount / wordCount : 1;

  const sentenceLengths = loweredSentences.map((sentence) => {
    const parts = sentence.match(/\b[a-z0-9']+\b/g) ?? [];
    return parts.length;
  });

  const averageSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, count) => sum + count, 0) / sentenceLengths.length
      : 0;

  const sentenceVariance = computeVariance(sentenceLengths);
  const sentenceLengthStdDeviation = Math.sqrt(sentenceVariance);

  const transitionCount = loweredSentences.filter((sentence) =>
    TRANSITION_PATTERN.test(sentence),
  ).length;
  const transitionDensity = sentences.length ? transitionCount / sentences.length : 0;

  const openerCounts = new Map();
  for (const sentence of loweredSentences) {
    const sentenceWords = sentence.match(/\b[a-z0-9']+\b/g) ?? [];
    if (sentenceWords.length < 2) continue;

    const opener = `${sentenceWords[0]} ${sentenceWords[1]}`;
    openerCounts.set(opener, (openerCounts.get(opener) ?? 0) + 1);
  }

  const repeatedOpeners = Array.from(openerCounts.values()).reduce((sum, count) => {
    if (count > 1) {
      return sum + (count - 1);
    }

    return sum;
  }, 0);
  const repeatedOpenerRatio = sentences.length ? repeatedOpeners / sentences.length : 0;

  const formalSentenceCount = sentences.filter((sentence) => {
    const trimmed = sentence.trim();
    return /^[A-Z]/.test(trimmed) && /[.!?]$/.test(trimmed);
  }).length;
  const formalSentenceRatio = sentences.length
    ? formalSentenceCount / sentences.length
    : 0;

  const contractionCount =
    rawText.match(/\b\w+(?:n't|'re|'ve|'ll|'d|'m|'s)\b/gi)?.length ?? 0;
  const contractionRatio = wordCount ? contractionCount / wordCount : 0;

  let repetitionMatches = 0;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      repetitionMatches += 1;
    }
  }

  const repetitionRatio = wordCount > 0 ? repetitionMatches / wordCount : 0;

  let score = 35;
  const reasons = [];

  if (uniqueRatio < 0.52) {
    score += 16;
    reasons.push("Low lexical variation detected across the submission.");
  }

  if (sentenceVariance < 10) {
    score += 12;
    reasons.push("Sentence length is very uniform, which may indicate generated text.");
  }

  if (repetitionRatio > 0.03) {
    score += 13;
    reasons.push("Repeated neighboring words or patterns were found.");
  }

  if (averageSentenceLength > 22) {
    score += 8;
    reasons.push("Long and consistently structured sentences were observed.");
  }

  if (transitionDensity < 0.22 && sentences.length >= 4) {
    score += 8;
    reasons.push("Transitions between ideas appear formulaic or abrupt.");
  }

  if (formalSentenceRatio > 0.88 && contractionRatio < 0.005 && sentences.length >= 4) {
    score += 9;
    reasons.push("Grammar appears overly polished with limited natural variation.");
  }

  const suspiciousSentences = sentences
    .map((sentence, index) => scoreSuspiciousSentence(sentence, index))
    .filter((entry) => entry && entry.aiSuspicionScore >= 56)
    .sort((left, right) => right.aiSuspicionScore - left.aiSuspicionScore)
    .slice(0, 8);

  if (suspiciousSentences.length > 0) {
    score += Math.min(12, suspiciousSentences.length * 2);
    reasons.push("Sentence-level checks flagged sections with elevated AI-style patterns.");
  }

  if (wordCount < 70) {
    score -= 8;
    reasons.push("Short content reduces confidence for AI detection.");
  }

  score = clamp(score, 1, 99);

  const explainabilitySignals = buildExplainabilitySignals({
    uniqueRatio,
    repetitionRatio,
    sentenceLengthStdDeviation,
    averageSentenceLength,
    transitionDensity,
    repeatedOpenerRatio,
    formalSentenceRatio,
    contractionRatio,
  });

  const overPerfectGrammarScore =
    explainabilitySignals.find((signal) => signal.id === "overPerfectGrammar")?.score ?? 0;

  const writingConsistencyScore = clamp(
    Math.round(
      100 -
        Math.min(45, sentenceLengthStdDeviation * 6) -
        Math.min(22, Math.max(0, 0.58 - uniqueRatio) * 120) -
        Math.min(15, repetitionRatio * 280),
    ),
    0,
    100,
  );

  const humanRevisionLikelihood = clamp(
    Math.round(
      (100 - score) * 0.55 +
        writingConsistencyScore * 0.25 +
        (100 - overPerfectGrammarScore) * 0.2,
    ),
    0,
    100,
  );

  return {
    probability: Number(score.toFixed(2)),
    isAIGenerated: score >= 60,
    details: {
      source: "heuristic",
      verdict: score >= 60 ? "Likely AI-generated" : "Likely human-written",
      reasons,
      confidenceLevel: deriveConfidenceLevel(Math.max(score, 100 - score)),
      writingConsistencyScore,
      humanRevisionLikelihood,
      suspiciousSentences,
      explainabilitySignals,
      metrics: {
        wordCount,
        uniqueWordRatio: Number(uniqueRatio.toFixed(3)),
        averageSentenceLength: Number(averageSentenceLength.toFixed(2)),
        sentenceVariance: Number(sentenceVariance.toFixed(2)),
        sentenceStdDeviation: Number(sentenceLengthStdDeviation.toFixed(2)),
        repetitionRatio: Number(repetitionRatio.toFixed(3)),
        transitionDensity: Number(transitionDensity.toFixed(3)),
        repeatedOpenerRatio: Number(repeatedOpenerRatio.toFixed(3)),
        formalSentenceRatio: Number(formalSentenceRatio.toFixed(3)),
        contractionRatio: Number(contractionRatio.toFixed(4)),
      },
    },
  };
};

const getNumericCandidate = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value <= 1 ? value * 100 : value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed <= 1 ? parsed * 100 : parsed;
    }
  }

  return null;
};

const tryExtractProbability = (payload) => {
  const candidates = [
    payload?.documents?.[0]?.completely_generated_prob,
    payload?.documents?.[0]?.average_generated_prob,
    payload?.documents?.[0]?.ai_probability,
    payload?.ai_probability,
    payload?.probability,
    payload?.score,
  ];

  for (const candidate of candidates) {
    const numeric = getNumericCandidate(candidate);
    if (numeric !== null) {
      return clamp(numeric, 0, 100);
    }
  }

  return null;
};

const runGPTZeroAnalysis = async (text) => {
  const apiKey = process.env.GPTZERO_API_KEY;
  if (!apiKey) return null;

  try {
    // GPTZero integration guide:
    // 1) Set GPTZERO_API_KEY in backend/.env.
    // 2) Optionally override endpoint with GPTZERO_API_URL.
    // 3) Keep this request isolated so you can swap GPTZero versions without
    //    touching class/submission business logic.
    const endpoint =
      process.env.GPTZERO_API_URL ?? "https://api.gptzero.me/v2/predict/text";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ document: text }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const probability = tryExtractProbability(payload);

    if (probability === null) {
      return null;
    }

    return {
      probability: Number(probability.toFixed(2)),
      isAIGenerated: probability >= 60,
      details: {
        source: "gptzero",
        verdict: probability >= 60 ? "Likely AI-generated" : "Likely human-written",
        reasons: ["Scored using GPTZero API response."],
      },
    };
  } catch {
    return null;
  }
};

const normalizeScore = (value) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : null;

  if (numeric === null || !Number.isFinite(numeric)) {
    return null;
  }

  return clamp(Number(numeric.toFixed(2)), 0, 100);
};

const buildAnalysisSummary = (analysis) => {
  const aiProbability = clamp(Number(analysis.probability) || 0, 0, 100);
  const humanProbability = Number((100 - aiProbability).toFixed(2));
  const confidenceScore = Number(
    Math.max(aiProbability, humanProbability).toFixed(2),
  );
  const confidenceLevel = deriveConfidenceLevel(confidenceScore);

  const baselineConsistency = Number((humanProbability * 0.75 + 12.5).toFixed(2));
  const writingConsistencyScore =
    normalizeScore(analysis?.details?.writingConsistencyScore) ??
    clamp(baselineConsistency, 0, 100);

  const baselineHumanRevisionLikelihood = Number(
    ((humanProbability + writingConsistencyScore) / 2).toFixed(2),
  );
  const humanRevisionLikelihood =
    normalizeScore(analysis?.details?.humanRevisionLikelihood) ??
    clamp(baselineHumanRevisionLikelihood, 0, 100);

  return {
    aiProbability: Number(aiProbability.toFixed(2)),
    humanProbability,
    confidenceScore,
    isAIGenerated: aiProbability >= 60,
    details: {
      ...analysis.details,
      aiProbability: Number(aiProbability.toFixed(2)),
      humanProbability,
      confidenceScore,
      confidenceLevel,
      writingConsistencyScore,
      humanRevisionLikelihood,
    },
  };
};

const analyzeText = async (text) => {
  const heuristicAnalysis = runHeuristicAnalysis(text);
  const fromGPTZero = await runGPTZeroAnalysis(text);
  if (fromGPTZero && typeof fromGPTZero.probability === "number") {
    const blendedProbability = Number(
      (fromGPTZero.probability * 0.75 + heuristicAnalysis.probability * 0.25).toFixed(
        2,
      ),
    );

    const heuristicReasons = Array.isArray(heuristicAnalysis.details?.reasons)
      ? heuristicAnalysis.details.reasons
      : [];

    return buildAnalysisSummary({
      probability: blendedProbability,
      isAIGenerated: blendedProbability >= 60,
      details: {
        ...heuristicAnalysis.details,
        source: "gptzero+heuristic",
        gptzeroProbability: Number(fromGPTZero.probability.toFixed(2)),
        heuristicProbability: Number(heuristicAnalysis.probability.toFixed(2)),
        verdict:
          blendedProbability >= 60
            ? "Likely AI-generated (blended model + heuristics)"
            : "Likely human-written (blended model + heuristics)",
        reasons: [
          `External model estimate: ${Number(fromGPTZero.probability).toFixed(2)}% AI probability.`,
          ...heuristicReasons,
        ],
      },
    });
  }

  return buildAnalysisSummary(heuristicAnalysis);
};

const getStudentIdentityKey = (name, email) =>
  `${String(email ?? "").trim().toLowerCase()}::${String(name ?? "")
    .trim()
    .toLowerCase()}`;

const getAccessibleClass = async (classId, user) => {
  if (user.role === "teacher") {
    const teacherClass = await pool.query(
      "SELECT * FROM classes WHERE id = $1 AND teacher_id = $2",
      [classId, user.id],
    );

    return teacherClass.rows[0] ?? null;
  }

  if (user.role === "student") {
    const studentClass = await pool.query(
      `SELECT c.*
       FROM classes c
       INNER JOIN class_enrollments ce ON ce.class_id = c.id
       WHERE c.id = $1 AND ce.student_id = $2`,
      [classId, user.id],
    );

    return studentClass.rows[0] ?? null;
  }

  return null;
};

const monthKeyFromDate = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const monthLabelFromDate = (date) =>
  date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const buildRecentMonthBuckets = (count = 6) => {
  const now = new Date();
  const buckets = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );

    buckets.push({
      key: monthKeyFromDate(bucketDate),
      month: monthLabelFromDate(bucketDate),
      submissions: 0,
      flaggedOutputs: 0,
      integrityScores: [],
    });
  }

  return buckets;
};

const toISOStringOrNull = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const buildNotificationId = (type, activityId, eventAt) =>
  `${type}:${String(activityId)}:${String(eventAt)}`;

const formatNotifications = ({ newActivities, upcomingActivities }) => {
  const now = Date.now();

  const newActivityNotifications = newActivities.map((activity) => {
    const eventAt = toISOStringOrNull(activity.created_at) ?? new Date().toISOString();
    const dueDate = toISOStringOrNull(activity.due_date);

    return {
      id: buildNotificationId("new_activity", activity.activity_id, eventAt),
      type: "new_activity",
      severity: "info",
      classId: String(activity.class_id),
      className: activity.class_name,
      activityId: String(activity.activity_id),
      activityTitle: activity.activity_title,
      title: "New activity added",
      message: `${activity.activity_title} was added in ${activity.class_name}.`,
      eventAt,
      dueDate,
    };
  });

  const upcomingDeadlineNotifications = upcomingActivities.map((activity) => {
    const dueDate = toISOStringOrNull(activity.due_date) ?? new Date().toISOString();
    const createdAt = toISOStringOrNull(activity.created_at);
    const dueInMs = new Date(dueDate).getTime() - now;
    const dueInHours = dueInMs / (1000 * 60 * 60);
    const severity = dueInHours <= 48 ? "warning" : "info";

    return {
      id: buildNotificationId("upcoming_deadline", activity.activity_id, dueDate),
      type: "upcoming_deadline",
      severity,
      classId: String(activity.class_id),
      className: activity.class_name,
      activityId: String(activity.activity_id),
      activityTitle: activity.activity_title,
      title: "Upcoming deadline",
      message: `${activity.activity_title} in ${activity.class_name} is due soon.`,
      eventAt: dueDate,
      dueDate,
      createdAt,
    };
  });

  return [...upcomingDeadlineNotifications, ...newActivityNotifications]
    .sort((left, right) => {
      const leftTime = new Date(left.eventAt).getTime();
      const rightTime = new Date(right.eventAt).getTime();
      return rightTime - leftTime;
    });
};

router.get("/mine", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view class list." });
    }

    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.student_count, c.assignment_count, c.created_at,
              u.name AS teacher_name, u.profile_image_url AS teacher_profile_image_url
       FROM classes c
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE c.teacher_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id],
    );

    return res.status(200).json({ classes: result.rows });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load classes.",
      error: error.message,
    });
  }
});

router.get("/notifications", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ message: "Invalid user role for notifications." });
    }

    if (role === "student") {
      const [newActivitiesResult, upcomingActivitiesResult] = await Promise.all([
        pool.query(
          `SELECT a.id AS activity_id, a.class_id, c.name AS class_name,
                  a.title AS activity_title, a.created_at, a.due_date
           FROM activities a
           INNER JOIN classes c ON c.id = a.class_id
           INNER JOIN class_enrollments ce ON ce.class_id = c.id
           WHERE ce.student_id = $1
           ORDER BY a.created_at DESC`,
          [userId],
        ),
        pool.query(
          `SELECT a.id AS activity_id, a.class_id, c.name AS class_name,
                  a.title AS activity_title, a.created_at, a.due_date
           FROM activities a
           INNER JOIN classes c ON c.id = a.class_id
           INNER JOIN class_enrollments ce ON ce.class_id = c.id
           LEFT JOIN submissions s ON s.activity_id = a.id AND s.student_id = $1
           WHERE ce.student_id = $1
             AND a.due_date >= NOW()
             AND s.id IS NULL
           ORDER BY a.due_date ASC`,
          [userId],
        ),
      ]);

      const notifications = formatNotifications({
        newActivities: newActivitiesResult.rows,
        upcomingActivities: upcomingActivitiesResult.rows,
      });

      return res.status(200).json({ notifications });
    }

    const [newActivitiesResult, upcomingActivitiesResult] = await Promise.all([
      pool.query(
        `SELECT a.id AS activity_id, a.class_id, c.name AS class_name,
                a.title AS activity_title, a.created_at, a.due_date
         FROM activities a
         INNER JOIN classes c ON c.id = a.class_id
         WHERE c.teacher_id = $1
         ORDER BY a.created_at DESC`,
        [userId],
      ),
      pool.query(
        `SELECT a.id AS activity_id, a.class_id, c.name AS class_name,
                a.title AS activity_title, a.created_at, a.due_date
         FROM activities a
         INNER JOIN classes c ON c.id = a.class_id
         WHERE c.teacher_id = $1
           AND a.due_date >= NOW()
         ORDER BY a.due_date ASC`,
        [userId],
      ),
    ]);

    const notifications = formatNotifications({
      newActivities: newActivitiesResult.rows,
      upcomingActivities: upcomingActivitiesResult.rows,
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load notifications.",
      error: error.message,
    });
  }
});

router.get("/teacher/overview", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view this overview." });
    }

    const [classesResult, activitiesResult, enrollmentsResult] = await Promise.all([
      pool.query(
        `SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.student_count, c.assignment_count, c.created_at,
                u.name AS teacher_name, u.profile_image_url AS teacher_profile_image_url
         FROM classes c
         INNER JOIN users u ON u.id = c.teacher_id
         WHERE c.teacher_id = $1
         ORDER BY c.created_at DESC`,
        [req.user.id],
      ),
      pool.query(
        `SELECT a.id, a.class_id, c.name AS class_name,
                a.title, a.instructor, a.description, a.submission_type, a.due_date, a.created_at,
                COALESCE((SELECT COUNT(*) FROM submissions s WHERE s.activity_id = a.id), 0)::int AS submission_count
         FROM activities a
         INNER JOIN classes c ON c.id = a.class_id
         WHERE c.teacher_id = $1
         ORDER BY a.created_at DESC`,
        [req.user.id],
      ),
      pool.query(
        `SELECT ce.class_id, ce.joined_at, u.id, u.name, u.email, u.profile_image_url,
                COALESCE((
                  SELECT COUNT(*)
                  FROM submissions s
                  INNER JOIN activities a ON a.id = s.activity_id
                  WHERE a.class_id = ce.class_id AND s.student_id = u.id
                ), 0)::int AS submission_count
         FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         INNER JOIN users u ON u.id = ce.student_id
         WHERE c.teacher_id = $1
         ORDER BY ce.joined_at ASC`,
        [req.user.id],
      ),
    ]);

    const dedupedStudents = new Map();

    for (const enrollment of enrollmentsResult.rows) {
      const key = getStudentIdentityKey(enrollment.name, enrollment.email);
      const joinedAt = enrollment.joined_at;

      if (!dedupedStudents.has(key)) {
        dedupedStudents.set(key, {
          id: enrollment.id,
          name: enrollment.name,
          email: enrollment.email,
          profile_image_url: enrollment.profile_image_url ?? null,
          first_joined_at: joinedAt,
          last_joined_at: joinedAt,
          submission_count: Number(enrollment.submission_count ?? 0),
          class_ids: new Set([Number(enrollment.class_id)]),
        });

        continue;
      }

      const existing = dedupedStudents.get(key);
      existing.class_ids.add(Number(enrollment.class_id));
      existing.submission_count += Number(enrollment.submission_count ?? 0);

      if (
        new Date(joinedAt).getTime() <
        new Date(existing.first_joined_at).getTime()
      ) {
        existing.first_joined_at = joinedAt;
      }

      if (
        new Date(joinedAt).getTime() >
        new Date(existing.last_joined_at).getTime()
      ) {
        existing.last_joined_at = joinedAt;
      }

      // Prefer any available profile image from duplicate records.
      if (!existing.profile_image_url && enrollment.profile_image_url) {
        existing.profile_image_url = enrollment.profile_image_url;
      }
    }

    const students = Array.from(dedupedStudents.values())
      .map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        profile_image_url: student.profile_image_url,
        first_joined_at: student.first_joined_at,
        last_joined_at: student.last_joined_at,
        class_count: student.class_ids.size,
        submission_count: student.submission_count,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const now = Date.now();
    const upcoming = [...activitiesResult.rows]
      .filter((activity) => new Date(activity.due_date).getTime() >= now)
      .sort(
        (left, right) =>
          new Date(left.due_date).getTime() - new Date(right.due_date).getTime(),
      );

    return res.status(200).json({
      classes: classesResult.rows,
      students,
      activities: activitiesResult.rows,
      upcoming,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load teacher overview.",
      error: error.message,
    });
  }
});

router.get("/teacher/analytics", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({
        message: "Only teachers can view analytics.",
      });
    }

    const submissionResult = await pool.query(
      `SELECT s.ai_probability, s.submitted_at, c.id AS class_id, c.name AS class_name
       FROM submissions s
       INNER JOIN activities a ON a.id = s.activity_id
       INNER JOIN classes c ON c.id = a.class_id
       WHERE c.teacher_id = $1
       ORDER BY s.submitted_at ASC`,
      [req.user.id],
    );

    const classStatsMap = new Map();
    const analyzedIntegrityScores = [];
    const monthBuckets = buildRecentMonthBuckets(6);
    const monthBucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    for (const row of submissionResult.rows) {
      const classId = Number(row.class_id);
      if (!Number.isFinite(classId)) {
        continue;
      }

      const className = row.class_name ?? "Unknown Class";
      const aiProbability = getNumericCandidate(row.ai_probability);
      const isFlagged = aiProbability !== null && aiProbability >= 60;

      if (!classStatsMap.has(classId)) {
        classStatsMap.set(classId, {
          classId: String(classId),
          className,
          submissions: 0,
          flaggedOutputs: 0,
          aiProbabilities: [],
          integrityScores: [],
        });
      }

      const classStats = classStatsMap.get(classId);
      classStats.submissions += 1;

      if (isFlagged) {
        classStats.flaggedOutputs += 1;
      }

      if (aiProbability !== null) {
        classStats.aiProbabilities.push(aiProbability);
        const integrityScore = Number((100 - aiProbability).toFixed(2));
        classStats.integrityScores.push(integrityScore);
        analyzedIntegrityScores.push(integrityScore);
      }

      const submittedAt = new Date(row.submitted_at);
      if (Number.isFinite(submittedAt.getTime())) {
        const key = monthKeyFromDate(submittedAt);
        const monthBucket = monthBucketMap.get(key);

        if (monthBucket) {
          monthBucket.submissions += 1;

          if (isFlagged) {
            monthBucket.flaggedOutputs += 1;
          }

          if (aiProbability !== null) {
            monthBucket.integrityScores.push(Number((100 - aiProbability).toFixed(2)));
          }
        }
      }
    }

    const allClassAnalytics = Array.from(classStatsMap.values())
      .map((entry) => {
        const averageAiProbability = average(entry.aiProbabilities);
        const averageIntegrityScore = average(entry.integrityScores);
        const flaggedRate = entry.submissions
          ? (entry.flaggedOutputs / entry.submissions) * 100
          : 0;

        return {
          classId: entry.classId,
          className: entry.className,
          submissions: entry.submissions,
          flaggedOutputs: entry.flaggedOutputs,
          averageAiProbability,
          averageIntegrityScore,
          suspicionIndex: Number(
            (
              (averageAiProbability ?? 0) * 0.7 +
              flaggedRate * 0.3
            ).toFixed(2),
          ),
        };
      });

    const topSuspiciousClasses = [...allClassAnalytics]
      .sort((left, right) => {
        if (right.suspicionIndex !== left.suspicionIndex) {
          return right.suspicionIndex - left.suspicionIndex;
        }

        if (right.flaggedOutputs !== left.flaggedOutputs) {
          return right.flaggedOutputs - left.flaggedOutputs;
        }

        return right.submissions - left.submissions;
      })
      .slice(0, 5)
      .map(({ suspicionIndex, ...rest }) => rest);

    const monthlyTrends = monthBuckets.map((bucket) => ({
      month: bucket.month,
      monthKey: bucket.key,
      submissions: bucket.submissions,
      flaggedOutputs: bucket.flaggedOutputs,
      averageIntegrityScore: average(bucket.integrityScores),
    }));

    const flaggedOutputs = allClassAnalytics.reduce(
      (sum, classMetric) => sum + classMetric.flaggedOutputs,
      0,
    );

    return res.status(200).json({
      totals: {
        totalSubmissions: submissionResult.rows.length,
        flaggedOutputs,
        averageIntegrityScore: average(analyzedIntegrityScores),
      },
      topSuspiciousClasses,
      monthlyTrends,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load teacher analytics.",
      error: error.message,
    });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can create classes." });
    }

    const { name, code, description } = req.body;

    if (!name || !code || !description) {
      return res
        .status(400)
        .json({ message: "Please provide name, code, and description." });
    }

    const insert = await pool.query(
      `INSERT INTO classes (name, code, description, teacher_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, code, description, teacher_id, student_count, assignment_count, created_at`,
      [name, String(code).toUpperCase(), description, req.user.id],
    );

    return res.status(201).json({
      message: "Class created successfully.",
      class: insert.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Class code already exists." });
    }

    return res.status(500).json({
      message: "Failed to create class.",
      error: error.message,
    });
  }
});

router.post("/join", protect, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can join classes." });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Class code is required." });
    }

    const classResult = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.student_count, c.assignment_count, c.created_at,
              u.name AS teacher_name, u.profile_image_url AS teacher_profile_image_url
       FROM classes c
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE UPPER(c.code) = UPPER($1)
       LIMIT 1`,
      [code],
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ message: "Class not found for the provided code." });
    }

    const classroom = classResult.rows[0];

    const enrollment = await pool.query(
      `INSERT INTO class_enrollments (class_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (class_id, student_id) DO NOTHING
       RETURNING id`,
      [classroom.id, req.user.id],
    );

    const newlyEnrolled = enrollment.rows.length > 0;

    if (newlyEnrolled) {
      await pool.query(
        "UPDATE classes SET student_count = student_count + 1 WHERE id = $1",
        [classroom.id],
      );
    }

    return res.status(200).json({
      message: newlyEnrolled ? "Successfully joined class." : "You are already enrolled in this class.",
      class: {
        ...classroom,
        student_count: newlyEnrolled
          ? Number(classroom.student_count) + 1
          : Number(classroom.student_count),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to join class.",
      error: error.message,
    });
  }
});

router.get("/enrolled", protect, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view enrolled classes." });
    }

    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.student_count, c.assignment_count, c.created_at,
              ce.joined_at, u.name AS teacher_name, u.profile_image_url AS teacher_profile_image_url
       FROM class_enrollments ce
       INNER JOIN classes c ON c.id = ce.class_id
       INNER JOIN users u ON u.id = c.teacher_id
       WHERE ce.student_id = $1
       ORDER BY ce.joined_at DESC`,
      [req.user.id],
    );

    return res.status(200).json({ classes: result.rows });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load enrolled classes.",
      error: error.message,
    });
  }
});

router.get("/:classId/activities", protect, async (req, res) => {
  try {
    const classId = Number(req.params.classId);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ message: "Invalid class id." });
    }

    const classroom = await getAccessibleClass(classId, req.user);

    if (!classroom) {
      return res.status(403).json({ message: "You do not have access to this class." });
    }

    if (req.user.role === "student") {
      const result = await pool.query(
        `SELECT a.id, a.class_id, a.title, a.instructor, a.description, a.submission_type, a.due_date, a.created_at,
                s.id AS submission_id, s.status AS submission_status, s.ai_probability, s.is_ai_generated,
                s.analysis_details, s.submitted_at, s.content_text, s.file_name
         FROM activities a
         LEFT JOIN submissions s ON s.activity_id = a.id AND s.student_id = $2
         WHERE a.class_id = $1
         ORDER BY a.due_date ASC`,
        [classId, req.user.id],
      );

      return res.status(200).json({ activities: result.rows });
    }

    const result = await pool.query(
      `SELECT a.id, a.class_id, a.title, a.instructor, a.description, a.submission_type, a.due_date, a.created_at,
              COALESCE((SELECT COUNT(*) FROM submissions s WHERE s.activity_id = a.id), 0)::int AS submission_count
       FROM activities a
       WHERE a.class_id = $1
       ORDER BY a.created_at DESC`,
      [classId],
    );

    return res.status(200).json({ activities: result.rows });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load activities.",
      error: error.message,
    });
  }
});

router.post("/:classId/activities", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can create activities." });
    }

    const classId = Number(req.params.classId);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ message: "Invalid class id." });
    }

    const classroom = await pool.query(
      "SELECT id FROM classes WHERE id = $1 AND teacher_id = $2",
      [classId, req.user.id],
    );

    if (classroom.rows.length === 0) {
      return res.status(403).json({ message: "You do not own this class." });
    }

    const { title, instructor, description, submissionType, dueDate } = req.body;

    if (!title || !instructor || !description || !submissionType || !dueDate) {
      return res.status(400).json({
        message:
          "Please provide title, instructor, description, submission type, and due date.",
      });
    }

    const normalizedSubmissionType = String(submissionType).toLowerCase();

    if (!["essay", "file"].includes(normalizedSubmissionType)) {
      return res.status(400).json({ message: "Submission type must be essay or file." });
    }

    const insert = await pool.query(
      `INSERT INTO activities (class_id, title, instructor, description, submission_type, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, class_id, title, instructor, description, submission_type, due_date, created_at`,
      [classId, title, instructor, description, normalizedSubmissionType, dueDate],
    );

    await pool.query(
      "UPDATE classes SET assignment_count = assignment_count + 1 WHERE id = $1",
      [classId],
    );

    return res.status(201).json({
      message: "Activity created successfully.",
      activity: insert.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create activity.",
      error: error.message,
    });
  }
});

router.post("/activities/:activityId/submissions", protect, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit activities." });
    }

    const activityId = Number(req.params.activityId);

    if (!Number.isFinite(activityId)) {
      return res.status(400).json({ message: "Invalid activity id." });
    }

    const activityResult = await pool.query(
      `SELECT a.id, a.class_id, a.submission_type
       FROM activities a
       WHERE a.id = $1`,
      [activityId],
    );

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: "Activity not found." });
    }

    const activity = activityResult.rows[0];

    const enrollment = await pool.query(
      `SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2`,
      [activity.class_id, req.user.id],
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ message: "You are not enrolled in this class." });
    }

    const { contentText, fileName, extractedText } = req.body;

    // GPTZero integration guide for text + document scanning:
    // - Essay flow: pass `contentText`.
    // - File flow: upload document (PDF/DOCX/etc.), extract plain text on your
    //   upload service, and pass the extracted body via `extractedText`.
    // analyzeText() and GPTZero checks use this normalized text payload.
    const normalizedContent = [contentText, extractedText]
      .find((candidate) => typeof candidate === "string")
      ?.trim();

    if (activity.submission_type === "essay" && !normalizedContent) {
      return res.status(400).json({ message: "Essay submissions require text content." });
    }

    if (activity.submission_type === "file" && !fileName?.trim()) {
      return res.status(400).json({ message: "File submissions require a file name." });
    }

    const submission = await pool.query(
      `INSERT INTO submissions (activity_id, student_id, content_text, file_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (activity_id, student_id)
       DO UPDATE SET
         content_text = EXCLUDED.content_text,
         file_name = EXCLUDED.file_name,
         status = 'pending',
         ai_probability = NULL,
         is_ai_generated = NULL,
         analysis_details = NULL,
         submitted_at = NOW(),
         updated_at = NOW()
      RETURNING id, activity_id, student_id, content_text, file_name, status,
                 ai_probability, is_ai_generated, analysis_details, submitted_at, updated_at`,
      [activityId, req.user.id, normalizedContent ?? null, fileName ?? null],
    );

    return res.status(200).json({
      message: "Submission saved successfully.",
      submission: submission.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit activity.",
      error: error.message,
    });
  }
});

router.get("/:classId/students", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view enrolled students." });
    }

    const classId = Number(req.params.classId);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ message: "Invalid class id." });
    }

    const classroom = await pool.query(
      "SELECT id FROM classes WHERE id = $1 AND teacher_id = $2",
      [classId, req.user.id],
    );

    if (classroom.rows.length === 0) {
      return res.status(403).json({ message: "You do not own this class." });
    }

    const students = await pool.query(
      `SELECT u.id, u.name, u.email, u.profile_image_url, ce.joined_at,
              COALESCE((
                SELECT COUNT(*)
                FROM submissions s
                INNER JOIN activities a ON a.id = s.activity_id
                WHERE a.class_id = $1 AND s.student_id = u.id
              ), 0)::int AS submission_count
       FROM class_enrollments ce
       INNER JOIN users u ON u.id = ce.student_id
       WHERE ce.class_id = $1
       ORDER BY ce.joined_at ASC`,
      [classId],
    );

    return res.status(200).json({ students: students.rows });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load enrolled students.",
      error: error.message,
    });
  }
});

router.get("/:classId/submissions", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view class submissions." });
    }

    const classId = Number(req.params.classId);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ message: "Invalid class id." });
    }

    const classroom = await pool.query(
      "SELECT id FROM classes WHERE id = $1 AND teacher_id = $2",
      [classId, req.user.id],
    );

    if (classroom.rows.length === 0) {
      return res.status(403).json({ message: "You do not own this class." });
    }

    const submissions = await pool.query(
      `SELECT s.id, s.activity_id, a.title AS activity_title, a.submission_type, a.due_date,
              s.student_id, u.name AS student_name, u.email AS student_email,
              s.content_text, s.file_name, s.status, s.ai_probability, s.is_ai_generated,
              s.analysis_details, s.submitted_at, s.updated_at
       FROM submissions s
       INNER JOIN activities a ON a.id = s.activity_id
       INNER JOIN users u ON u.id = s.student_id
       WHERE a.class_id = $1
       ORDER BY s.submitted_at DESC`,
      [classId],
    );

    return res.status(200).json({ submissions: submissions.rows });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load submissions.",
      error: error.message,
    });
  }
});

router.get("/submissions/:submissionId", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view submissions." });
    }

    const submissionId = Number(req.params.submissionId);

    if (!Number.isFinite(submissionId)) {
      return res.status(400).json({ message: "Invalid submission id." });
    }

    const submission = await pool.query(
      `SELECT s.id, s.activity_id, a.class_id, c.name AS class_name,
              a.title AS activity_title, a.submission_type, a.due_date,
              s.student_id, u.name AS student_name, u.email AS student_email,
              s.content_text, s.file_name, s.status, s.ai_probability, s.is_ai_generated,
              s.analysis_details, s.submitted_at, s.updated_at
       FROM submissions s
       INNER JOIN activities a ON a.id = s.activity_id
       INNER JOIN classes c ON c.id = a.class_id
       INNER JOIN users u ON u.id = s.student_id
       WHERE s.id = $1 AND c.teacher_id = $2
       LIMIT 1`,
      [submissionId, req.user.id],
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({
        message: "Submission not found or not accessible in your classes.",
      });
    }

    return res.status(200).json({ submission: submission.rows[0] });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load submission.",
      error: error.message,
    });
  }
});

router.post("/submissions/:submissionId/analyze", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can analyze submissions." });
    }

    const submissionId = Number(req.params.submissionId);

    if (!Number.isFinite(submissionId)) {
      return res.status(400).json({ message: "Invalid submission id." });
    }

    const submissionResult = await pool.query(
      `SELECT s.id, s.content_text, s.file_name
       FROM submissions s
       INNER JOIN activities a ON a.id = s.activity_id
       INNER JOIN classes c ON c.id = a.class_id
       WHERE s.id = $1 AND c.teacher_id = $2
       LIMIT 1`,
      [submissionId, req.user.id],
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        message: "Submission not found or not accessible in your classes.",
      });
    }

    const submission = submissionResult.rows[0];
    const analysis = await analyzeText(submission.content_text ?? "");

    const updated = await pool.query(
      `UPDATE submissions
       SET status = 'analyzed',
           ai_probability = $2,
           is_ai_generated = $3,
           analysis_details = $4::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, ai_probability, is_ai_generated, analysis_details, updated_at`,
      [
        submission.id,
        analysis.aiProbability,
        analysis.isAIGenerated,
        JSON.stringify({
          ...analysis.details,
          fileName: submission.file_name ?? null,
        }),
      ],
    );

    return res.status(200).json({
      message: "Submission analyzed successfully.",
      submission: updated.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to analyze submission.",
      error: error.message,
    });
  }
});

router.post("/:classId/submissions/analyze", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can analyze submissions." });
    }

    const classId = Number(req.params.classId);

    if (!Number.isFinite(classId)) {
      return res.status(400).json({ message: "Invalid class id." });
    }

    const classroom = await pool.query(
      "SELECT id FROM classes WHERE id = $1 AND teacher_id = $2",
      [classId, req.user.id],
    );

    if (classroom.rows.length === 0) {
      return res.status(403).json({ message: "You do not own this class." });
    }

    const submissionRows = await pool.query(
      `SELECT s.id, s.content_text, s.file_name, s.status
       FROM submissions s
       INNER JOIN activities a ON a.id = s.activity_id
       WHERE a.class_id = $1
       ORDER BY s.submitted_at ASC`,
      [classId],
    );

    if (submissionRows.rows.length === 0) {
      return res.status(200).json({ message: "No submissions available for analysis.", updated: 0 });
    }

    let updated = 0;

    for (const submission of submissionRows.rows) {
      const textToAnalyze = submission.content_text ?? "";
      const analysis = await analyzeText(textToAnalyze);

      await pool.query(
        `UPDATE submissions
         SET status = 'analyzed',
             ai_probability = $2,
             is_ai_generated = $3,
             analysis_details = $4::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [
          submission.id,
          analysis.aiProbability,
          analysis.isAIGenerated,
          JSON.stringify({
            ...analysis.details,
            fileName: submission.file_name ?? null,
          }),
        ],
      );

      updated += 1;
    }

    return res.status(200).json({
      message: "Submissions analyzed successfully.",
      updated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to analyze submissions.",
      error: error.message,
    });
  }
});

export default router;
