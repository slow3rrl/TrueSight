import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const router = express.Router();

let schemaReady = false;

const ensureClassroomSchema = async () => {
  if (schemaReady) return;

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
      "SELECT id, name, email, role FROM users WHERE id = $1",
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

const runHeuristicAnalysis = (text) => {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return {
      probability: 0,
      isAIGenerated: false,
      details: {
        source: "system",
        verdict: "No readable text found for analysis",
        reasons: [
          "This submission appears to be file-only with no extracted text.",
          "Upload a text body to run confidence scoring.",
        ],
      },
    };
  }

  const words = normalized.match(/\b[a-z0-9']+\b/g) ?? [];
  const sentences = normalized
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const wordCount = words.length;
  const uniqueWordCount = new Set(words).size;
  const uniqueRatio = wordCount ? uniqueWordCount / wordCount : 1;

  const sentenceLengths = sentences.map((sentence) => {
    const parts = sentence.match(/\b[a-z0-9']+\b/g) ?? [];
    return parts.length;
  });

  const averageSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, count) => sum + count, 0) / sentenceLengths.length
      : 0;

  const sentenceVariance = computeVariance(sentenceLengths);

  let repetitionMatches = 0;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      repetitionMatches += 1;
    }
  }

  const repetitionRatio = wordCount > 0 ? repetitionMatches / wordCount : 0;

  let score = 35;
  const reasons = [];

  if (uniqueRatio < 0.5) {
    score += 18;
    reasons.push("Low lexical variation detected across the submission.");
  }

  if (sentenceVariance < 8) {
    score += 14;
    reasons.push("Sentence length is very uniform, which may indicate generated text.");
  }

  if (repetitionRatio > 0.03) {
    score += 12;
    reasons.push("Repeated neighboring words or patterns were found.");
  }

  if (averageSentenceLength > 22) {
    score += 8;
    reasons.push("Long and consistently structured sentences were observed.");
  }

  if (wordCount < 70) {
    score -= 8;
    reasons.push("Short content reduces confidence for AI detection.");
  }

  score = clamp(score, 1, 99);

  return {
    probability: Number(score.toFixed(2)),
    isAIGenerated: score >= 60,
    details: {
      source: "heuristic",
      verdict: score >= 60 ? "Likely AI-generated" : "Likely human-written",
      reasons,
      metrics: {
        wordCount,
        uniqueWordRatio: Number(uniqueRatio.toFixed(3)),
        averageSentenceLength: Number(averageSentenceLength.toFixed(2)),
        sentenceVariance: Number(sentenceVariance.toFixed(2)),
        repetitionRatio: Number(repetitionRatio.toFixed(3)),
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

const buildAnalysisSummary = (analysis) => {
  const aiProbability = clamp(Number(analysis.probability) || 0, 0, 100);
  const humanProbability = Number((100 - aiProbability).toFixed(2));
  const confidenceScore = Number(
    Math.max(aiProbability, humanProbability).toFixed(2),
  );

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
    },
  };
};

const analyzeText = async (text) => {
  const fromGPTZero = await runGPTZeroAnalysis(text);
  if (fromGPTZero) {
    return buildAnalysisSummary(fromGPTZero);
  }

  return buildAnalysisSummary(runHeuristicAnalysis(text));
};

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

router.get("/mine", protect, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view class list." });
    }

    const result = await pool.query(
      `SELECT id, name, code, description, teacher_id, student_count, assignment_count, created_at
       FROM classes
       WHERE teacher_id = $1
       ORDER BY created_at DESC`,
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
      `SELECT id, name, code, description, teacher_id, student_count, assignment_count, created_at
       FROM classes
       WHERE UPPER(code) = UPPER($1)
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
              ce.joined_at, u.name AS teacher_name
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
      `SELECT u.id, u.name, u.email, ce.joined_at,
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
