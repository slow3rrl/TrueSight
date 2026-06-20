import path from "path";
import fs from "fs/promises";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";

type ImageAnalysisResult = {
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  isAIGenerated: boolean;
  details: Record<string, unknown>;
};

type ImagePredictionLabel = "Human" | "AI-generated" | "Needs Review";

type ImageClassProbability = {
  label: "Human" | "AI-generated";
  probability: number;
};

type EfficientNetV2Prediction = {
  label: ImagePredictionLabel;
  modelLabel?: "Human" | "AI-generated";
  confidence: number;
  aiProbability: number;
  humanProbability: number;
  threshold: number;
  humanConfidentMax: number;
  aiConfidentMin: number;
  message: string;
  classNames: Array<"Human" | "AI-generated">;
  probabilities: ImageClassProbability[];
  rawOutput?: number[];
  timings?: Record<string, number>;
  preprocessing?: Record<string, unknown>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASS_NAMES = ["Human", "AI-generated"] as const;
const MODEL_FILE_NAME = "efficientnetv2_ai_human.keras";
const LABELS_FILE_NAME = "labels.json";
const CONFIGURED_PYTHON_EXECUTABLE =
  process.env.PYTHON_EXECUTABLE ?? process.env.PYTHON_PATH;
const PYTHON_EXECUTABLE = CONFIGURED_PYTHON_EXECUTABLE ?? "python";
const PYTHON_EXECUTABLE_ARGS: string[] = [];
const PREDICTOR_TIMEOUT_MS = Number(
  process.env.IMAGE_PREDICTOR_TIMEOUT_MS ?? 120_000,
);
const IMAGE_AI_THRESHOLD = Number(process.env.IMAGE_AI_THRESHOLD ?? 0.5);
const IMAGE_HUMAN_CONFIDENT_MAX = Number(
  process.env.IMAGE_HUMAN_CONFIDENT_MAX ?? 0.40,
);
const IMAGE_AI_CONFIDENT_MIN = Number(
  process.env.IMAGE_AI_CONFIDENT_MIN ?? 0.60,
);

const clamp = (value: number, min = 0, max = 100): number => {
  return Math.min(max, Math.max(min, value));
};

const toPercent = (value: unknown): number => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("EfficientNetV2 predictor returned an invalid score.");
  }

  return clamp(numberValue >= 0 && numberValue <= 1 ? numberValue * 100 : numberValue);
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

const dataUrlToBuffer = (dataUrl?: string | null): Buffer | null => {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

  if (!base64) return null;

  return Buffer.from(base64, "base64");
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
};

type ImageModelAssets = {
  modelPath: string;
  labelsPath: string;
};

const getLabelsPath = async (modelDirectory: string): Promise<string> => {
  const configuredPath = process.env.IMAGE_LABELS_PATH;

  if (configuredPath) {
    const resolvedPath = path.resolve(
      configuredPath.startsWith("file://")
        ? fileURLToPath(configuredPath)
        : configuredPath,
    );

    if (await fileExists(resolvedPath)) return resolvedPath;
    throw new Error(`labels.json file was not found: ${resolvedPath}`);
  }

  const labelsPath = path.join(modelDirectory, LABELS_FILE_NAME);

  if (await fileExists(labelsPath)) return labelsPath;

  throw new Error(
    `labels.json file was not found in ${modelDirectory}. Add ${LABELS_FILE_NAME} next to ${MODEL_FILE_NAME}, or set IMAGE_LABELS_PATH.`,
  );
};

const getImageModelAssets = async (): Promise<ImageModelAssets> => {
  const configuredPath = process.env.IMAGE_MODEL_PATH;

  if (configuredPath) {
    const filePath = configuredPath.startsWith("file://")
      ? fileURLToPath(configuredPath)
      : configuredPath;

    const resolvedPath = path.resolve(filePath);

    if (path.extname(resolvedPath).toLowerCase() === ".json") {
      throw new Error(
        `IMAGE_MODEL_PATH points to a JSON file. Set it to ${MODEL_FILE_NAME} or its containing folder, and use IMAGE_LABELS_PATH for labels when needed.`,
      );
    }

    if (path.extname(resolvedPath).toLowerCase() === ".keras") {
      if (!(await fileExists(resolvedPath))) {
        throw new Error(`EfficientNetV2 model file was not found: ${resolvedPath}`);
      }

      return {
        modelPath: resolvedPath,
        labelsPath: await getLabelsPath(path.dirname(resolvedPath)),
      };
    }

    return findImageModelInDirectory(resolvedPath);
  }

  const defaultModelDirectories = [path.resolve(__dirname, "../../models")];

  for (const modelDirectory of defaultModelDirectories) {
    const modelPath = path.join(modelDirectory, MODEL_FILE_NAME);

    if (await fileExists(modelPath)) {
      return await findImageModelInDirectory(modelDirectory);
    }
  }

  throw new Error(
    `EfficientNetV2 model file was not found. Add ${MODEL_FILE_NAME} and ${LABELS_FILE_NAME} to models/, or set IMAGE_MODEL_PATH and IMAGE_LABELS_PATH.`,
  );
};

const findImageModelInDirectory = async (
  modelDirectory: string,
): Promise<ImageModelAssets> => {
  const modelPath = path.join(modelDirectory, MODEL_FILE_NAME);

  if (await fileExists(modelPath)) {
    return {
      modelPath,
      labelsPath: await getLabelsPath(modelDirectory),
    };
  }

  throw new Error(
    `EfficientNetV2 model file was not found in ${modelDirectory}. Add ${MODEL_FILE_NAME}, or set IMAGE_MODEL_PATH.`,
  );
};

const normalizePredictionLabel = (label: unknown): ImagePredictionLabel => {
  const normalized = String(label ?? "").trim().toLowerCase();

  if (normalized === "human") return "Human";
  if (normalized === "ai-generated" || normalized === "ai generated") {
    return "AI-generated";
  }
  if (normalized === "needs review" || normalized === "uncertain") {
    return "Needs Review";
  }

  throw new Error(
    `Unexpected image model label "${String(label)}". Use Human, AI-generated, or Needs Review.`,
  );
};

const normalizeModelLabel = (label: unknown): "Human" | "AI-generated" => {
  const normalized = normalizePredictionLabel(label);

  if (normalized === "Needs Review") {
    throw new Error("EfficientNetV2 model label cannot be Needs Review.");
  }

  return normalized;
};

const parsePredictorJson = (output: string): EfficientNetV2Prediction => {
  const payload = JSON.parse(output) as Record<string, unknown>;

  if (typeof payload.error === "string") {
    throw new Error(payload.error);
  }

  const label = normalizePredictionLabel(payload.label);
  const modelLabel =
    typeof payload.modelLabel === "string"
      ? normalizeModelLabel(payload.modelLabel)
      : undefined;
  const confidence = toPercent(payload.confidence);
  const aiProbability = toPercent(payload.aiProbability);
  const humanProbability = toPercent(payload.humanProbability);
  const threshold = Number(payload.threshold ?? IMAGE_AI_THRESHOLD);
  const humanConfidentMax = Number(
    payload.humanConfidentMax ?? IMAGE_HUMAN_CONFIDENT_MAX,
  );
  const aiConfidentMin = Number(
    payload.aiConfidentMin ?? IMAGE_AI_CONFIDENT_MIN,
  );
  const message =
    typeof payload.message === "string"
      ? payload.message
      : "Image analysis completed.";

  const probabilities = Array.isArray(payload.probabilities)
    ? payload.probabilities.map((entry) => {
        const candidate = entry as Record<string, unknown>;

        return {
          label: normalizeModelLabel(candidate.label),
          probability: toPercent(candidate.probability),
        };
      })
    : [];

  const rawOutput = Array.isArray(payload.rawOutput)
    ? payload.rawOutput
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : undefined;
  const timings =
    typeof payload.timings === "object" && payload.timings !== null
      ? Object.fromEntries(
          Object.entries(payload.timings as Record<string, unknown>)
            .map(([key, value]) => [key, Number(value)])
            .filter(([, value]) => Number.isFinite(value)),
        )
      : undefined;
  const preprocessing =
    typeof payload.preprocessing === "object" && payload.preprocessing !== null
      ? (payload.preprocessing as Record<string, unknown>)
      : undefined;

  const result: EfficientNetV2Prediction = {
    label,
    confidence,
    aiProbability,
    humanProbability,
    threshold,
    humanConfidentMax,
    aiConfidentMin,
    message,
    classNames: [...CLASS_NAMES],
    probabilities,
  };

  if (modelLabel) {
    result.modelLabel = modelLabel;
  }

  if (rawOutput) {
    result.rawOutput = rawOutput;
  }

  if (timings) {
    result.timings = timings;
  }

  if (preprocessing) {
    result.preprocessing = preprocessing;
  }

  return result;
};

type PendingPrediction = {
  resolve: (prediction: EfficientNetV2Prediction) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ImagePredictorWorker = {
  child: ChildProcessWithoutNullStreams;
  assetKey: string;
  pending: Map<string, PendingPrediction>;
  ready: Promise<void>;
  stop: () => void;
};

let imagePredictorWorker: ImagePredictorWorker | null = null;
let predictionRequestId = 0;

const createImagePredictorWorker = async (
  modelPath: string,
  labelsPath: string,
): Promise<ImagePredictorWorker> => {
  const predictorPath = path.resolve(__dirname, "efficientnetv2_predict.py");

  if (!(await fileExists(predictorPath))) {
    throw new Error(`Python predictor script was not found: ${predictorPath}`);
  }

  const assetKey = `${modelPath}::${labelsPath}`;
  const child = spawn(
    PYTHON_EXECUTABLE,
    [...PYTHON_EXECUTABLE_ARGS, predictorPath, "--worker", modelPath, labelsPath],
    {
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const pending = new Map<string, PendingPrediction>();
  let stdoutBuffer = "";
  let stderrTail = "";
  let readyResolve: (() => void) | null = null;
  let readyReject: ((error: Error) => void) | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const readyTimer = setTimeout(() => {
    readyReject?.(
      new Error(
        `EfficientNetV2 worker did not become ready after ${PREDICTOR_TIMEOUT_MS}ms.`,
      ),
    );
  }, PREDICTOR_TIMEOUT_MS);

  const rejectAll = (error: Error) => {
    for (const pendingRequest of pending.values()) {
      clearTimeout(pendingRequest.timer);
      pendingRequest.reject(error);
    }

    pending.clear();
  };

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf-8");
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("{")) {
        continue;
      }

      try {
        const payload = JSON.parse(trimmed) as Record<string, unknown>;

        if (payload.type === "ready") {
          clearTimeout(readyTimer);
          console.log(
            `[image-model] EfficientNetV2 worker ready. threshold=${payload.threshold}, reviewBand=${payload.humanConfidentMax}-${payload.aiConfidentMin}, inputScale=${payload.inputScale}`,
          );
          readyResolve?.();
          continue;
        }

        const requestId =
          typeof payload.id === "string" ? payload.id : String(payload.id ?? "");
        const pendingRequest = pending.get(requestId);

        if (!pendingRequest) {
          continue;
        }

        pending.delete(requestId);
        clearTimeout(pendingRequest.timer);

        if (typeof payload.error === "string") {
          pendingRequest.reject(new Error(payload.error));
          continue;
        }

        pendingRequest.resolve(parsePredictorJson(trimmed));
      } catch (error) {
        console.warn(
          "[image-model] Ignored invalid EfficientNetV2 worker output:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrTail = `${stderrTail}${chunk.toString("utf-8")}`.slice(-4000);
  });

  child.on("error", (error) => {
    clearTimeout(readyTimer);
    readyReject?.(
      new Error(
        `Failed to start Python predictor "${PYTHON_EXECUTABLE}": ${error.message}`,
      ),
    );
    rejectAll(error);
  });

  child.on("close", (code) => {
    clearTimeout(readyTimer);
    const error = new Error(
      stderrTail.trim() ||
        `EfficientNetV2 worker exited with code ${code ?? "unknown"}.`,
    );
    readyReject?.(error);
    rejectAll(error);

    if (imagePredictorWorker?.child === child) {
      imagePredictorWorker = null;
    }
  });

  const worker: ImagePredictorWorker = {
    child,
    assetKey,
    pending,
    ready,
    stop: () => {
      child.kill();
    },
  };

  try {
    await ready;
  } catch (error) {
    child.kill();
    throw error;
  }

  return worker;
};

const getImagePredictorWorker = async (
  modelPath: string,
  labelsPath: string,
): Promise<ImagePredictorWorker> => {
  const assetKey = `${modelPath}::${labelsPath}`;

  if (imagePredictorWorker?.assetKey === assetKey) {
    await imagePredictorWorker.ready;
    return imagePredictorWorker;
  }

  imagePredictorWorker?.stop();
  imagePredictorWorker = await createImagePredictorWorker(modelPath, labelsPath);
  return imagePredictorWorker;
};

const runEfficientNetV2Prediction = async (
  modelPath: string,
  labelsPath: string,
  imageBuffer: Buffer,
): Promise<EfficientNetV2Prediction> => {
  const worker = await getImagePredictorWorker(modelPath, labelsPath);
  const requestId = `image-${Date.now()}-${predictionRequestId++}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.pending.delete(requestId);
      reject(
        new Error(
          `EfficientNetV2 prediction timed out after ${PREDICTOR_TIMEOUT_MS}ms.`,
        ),
      );
    }, PREDICTOR_TIMEOUT_MS);

    worker.pending.set(requestId, { resolve, reject, timer });
    worker.child.stdin.write(
      `${JSON.stringify({
        id: requestId,
        image: imageBuffer.toString("base64"),
      })}\n`,
    );
  });
};

export const warmUpImageModel = async (): Promise<void> => {
  const startedAt = Date.now();
  const { modelPath, labelsPath } = await getImageModelAssets();
  await getImagePredictorWorker(modelPath, labelsPath);
  console.log(
    `[image-model] EfficientNetV2 warm-up complete in ${Date.now() - startedAt}ms.`,
  );
};

const inspectImage = async (imageBuffer: Buffer) => {
  const pipeline = sharp(imageBuffer);
  const metadata = await pipeline.metadata();
  const stats = await sharp(imageBuffer)
    .stats()
    .catch(() => null);
  const dominant = stats?.dominant;

  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    format: metadata.format ?? null,
    space: metadata.space ?? null,
    channels: metadata.channels ?? null,
    hasAlpha: Boolean(metadata.hasAlpha),
    density: metadata.density ?? null,
    sizeBytes: imageBuffer.byteLength,
    dominantColor: dominant
      ? {
          r: dominant.r,
          g: dominant.g,
          b: dominant.b,
        }
      : null,
  };
};

const buildImageDetails = ({
  source,
  provider,
  verdict,
  aiProbability,
  humanProbability,
  confidenceScore,
  predictedLabel,
  modelLabel,
  fileName,
  imageProfile,
  labels,
  classProbabilities,
  rawOutput,
  modelStatus,
  threshold,
  humanConfidentMax,
  aiConfidentMin,
  message,
  timings,
  preprocessing,
  warning,
}: {
  source: string;
  provider: string;
  verdict: string;
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  predictedLabel?: ImagePredictionLabel | null;
  modelLabel?: "Human" | "AI-generated" | null;
  fileName?: string | null;
  imageProfile?: Record<string, unknown> | null;
  labels?: string[] | null;
  classProbabilities?: Array<{ label: string; probability: number }>;
  rawOutput?: number[];
  modelStatus: Record<string, unknown>;
  threshold?: number;
  humanConfidentMax?: number;
  aiConfidentMin?: number;
  message?: string;
  timings?: Record<string, number>;
  preprocessing?: Record<string, unknown>;
  warning?: string;
}): Record<string, unknown> => {
  const dimensions =
    imageProfile?.width && imageProfile?.height
      ? `${imageProfile.width}x${imageProfile.height}`
      : "Unavailable";

  return {
    detectorType: "image",
    source,
    provider,
    verdict,
    aiProbability,
    humanProbability,
    confidenceScore,
    finalPrediction: predictedLabel ?? verdict,
    predictedLabel: predictedLabel ?? verdict,
    modelLabel: modelLabel ?? null,
    message,
    threshold: threshold ?? IMAGE_AI_THRESHOLD,
    humanConfidentMax: humanConfidentMax ?? IMAGE_HUMAN_CONFIDENT_MAX,
    aiConfidentMin: aiConfidentMin ?? IMAGE_AI_CONFIDENT_MIN,
    confidenceLevel: getConfidenceLevel(confidenceScore),
    riskBand: getRiskBand(aiProbability),
    fileName: fileName ?? null,
    modelInputSize: "224x224",
    preprocessing:
      preprocessing ?? {
        convertToRgb: true,
        exifOrientationHandled: true,
        resize: "224x224",
        inputScale: process.env.IMAGE_MODEL_INPUT_SCALE ?? "0_1",
      },
    timings: timings ?? null,
    classLabels: labels ?? null,
    classProbabilities: classProbabilities ?? [],
    rawOutput: rawOutput ?? [],
    imageProfile: imageProfile ?? null,
    warning,
    scoreCards: [
      {
        id: "aiProbability",
        label: "AI image probability",
        value: aiProbability,
        unit: "%",
        tone: aiProbability >= 60 ? "risk" : "calm",
        description: "Model estimate that the image is synthetic or AI-generated.",
      },
      {
        id: "humanProbability",
        label: "Human probability",
        value: humanProbability,
        unit: "%",
        tone: humanProbability >= 60 ? "calm" : "risk",
        description: "Model estimate that the image is human-created.",
      },
      {
        id: "confidenceScore",
        label: "Confidence score",
        value: confidenceScore,
        unit: "%",
        tone: confidenceScore >= 72 ? "calm" : "warning",
        description: "Distance from an uncertain 50/50 result.",
      },
      {
        id: "imageSize",
        label: "Image dimensions",
        value: dimensions,
        unit: "",
        tone: "neutral",
        description: "Original image size read before resizing for model input.",
      },
    ],
    analysisTimeline: [
      {
        label: "Image decoding",
        status: imageProfile ? "complete" : "needs-review",
        detail: imageProfile
          ? `${dimensions} ${imageProfile.format ?? "image"} file decoded.`
          : "Image metadata could not be read.",
      },
      {
        label: "Model loading",
        status: modelStatus.loaded ? "complete" : "fallback",
        detail: modelStatus.message,
      },
      {
        label: "Threshold review",
        status: predictedLabel === "Needs Review" ? "needs-review" : "complete",
        detail:
          predictedLabel === "Needs Review"
            ? `AI probability is inside the review band (${((humanConfidentMax ?? IMAGE_HUMAN_CONFIDENT_MAX) * 100).toFixed(0)}%-${((aiConfidentMin ?? IMAGE_AI_CONFIDENT_MIN) * 100).toFixed(0)}%).`
            : `Decision threshold ${((threshold ?? IMAGE_AI_THRESHOLD) * 100).toFixed(0)}% with review band applied.`,
      },
      {
        label: "Class probability review",
        status: classProbabilities?.length ? "complete" : "needs-review",
        detail: classProbabilities?.length
          ? `${classProbabilities.length} model classes returned probabilities.`
          : "No model class probabilities were available.",
      },
    ],
    visualSignals: [
      {
        label: "Metadata profile",
        value: imageProfile ? "Available" : "Unavailable",
        detail:
          "Metadata helps teachers inspect format, size, dimensions, and color profile context.",
      },
      {
        label: "Classifier classes",
        value: classProbabilities?.length ?? 0,
        detail:
          "Class probabilities show which trained category contributed to the final score.",
      },
      {
        label: "Review reliability",
        value: modelStatus.loaded ? "Model-backed" : "Needs model setup",
        detail:
          "Image detection is strongest when the trained EfficientNetV2 Keras model is available.",
      },
    ],
    reviewChecklist: [
      {
        label: "Open the submitted image and inspect visible artifacts",
        status: "recommended",
      },
      {
        label: "Compare with assignment requirements and original source evidence",
        status: "recommended",
      },
      {
        label: "Treat image model output as a review signal, not standalone proof",
        status: "required",
      },
    ],
    integrationStatus: {
      providerConfigured: Boolean(modelStatus.loaded),
      liveProviderUsed: Boolean(modelStatus.loaded),
      fallbackUsed: !modelStatus.loaded,
      message: modelStatus.message,
    },
    note: "Image result depends on the quality and balance of the trained dataset.",
  };
};

export const analyzeImage = async (
  fileDataUrl?: string | null,
  fileName?: string | null,
): Promise<ImageAnalysisResult> => {
  const requestStartedAt = Date.now();
  const imageBuffer = dataUrlToBuffer(fileDataUrl);

  if (!imageBuffer) {
    return {
      aiProbability: 0,
      humanProbability: 100,
      confidenceScore: 0,
      isAIGenerated: false,
      details: {
        detectorType: "image",
        source: "image-decoder",
        provider: "Image Decoder",
        verdict: "No readable image found for analysis",
        fileName: fileName ?? null,
        integrationStatus: {
          providerConfigured: false,
          liveProviderUsed: false,
          fallbackUsed: true,
          message: "No image payload was available for analysis.",
        },
      },
    };
  }

  try {
    const metadataStartedAt = Date.now();
    const imageProfile = await inspectImage(imageBuffer);
    const metadataMs = Date.now() - metadataStartedAt;
    const { modelPath, labelsPath } = await getImageModelAssets();
    const prediction = await runEfficientNetV2Prediction(
      modelPath,
      labelsPath,
      imageBuffer,
    );
    const aiProbability =
      prediction.probabilities.find((entry) => entry.label === "AI-generated")
        ?.probability ?? (prediction.label === "AI-generated" ? prediction.confidence : 0);
    const humanProbability =
      prediction.probabilities.find((entry) => entry.label === "Human")
        ?.probability ?? prediction.humanProbability;
    const confidenceScore = prediction.confidence;
    const classProbabilities =
      prediction.probabilities.length > 0
        ? prediction.probabilities
        : [
            {
              label: "Human" as const,
              probability: humanProbability,
            },
            {
              label: "AI-generated" as const,
              probability: aiProbability,
            },
          ];
    const totalRequestMs = Date.now() - requestStartedAt;
    const timings = {
      ...(prediction.timings ?? {}),
      metadataMs,
      requestTotalMs: totalRequestMs,
    };

    console.log(
      `[image-model] ${fileName ?? "image"} prediction=${prediction.label} ai=${aiProbability.toFixed(2)}% human=${humanProbability.toFixed(2)}% total=${totalRequestMs}ms`,
    );

    return {
      aiProbability,
      humanProbability,
      confidenceScore,
      isAIGenerated: prediction.label === "AI-generated",
      details: buildImageDetails({
        source: "local-efficientnetv2-model",
        provider: "Local EfficientNetV2 Keras Image Model",
        verdict: prediction.label,
        predictedLabel: prediction.label,
        modelLabel: prediction.modelLabel ?? null,
        aiProbability,
        humanProbability,
        confidenceScore,
        fileName: fileName ?? null,
        imageProfile,
        labels: prediction.classNames,
        classProbabilities,
        rawOutput: prediction.rawOutput ?? [],
        threshold: prediction.threshold,
        humanConfidentMax: prediction.humanConfidentMax,
        aiConfidentMin: prediction.aiConfidentMin,
        message: prediction.message,
        ...(timings ? { timings } : {}),
        ...(prediction.preprocessing
          ? { preprocessing: prediction.preprocessing }
          : {}),
        modelStatus: {
          loaded: true,
          message:
            "Local EfficientNetV2 Keras model loaded and returned class probabilities.",
          modelPath,
          labelsPath,
        },
      }),
    };
  } catch (error: unknown) {
    const imageProfile = await inspectImage(imageBuffer).catch(() => null);
    const message =
      error instanceof Error ? error.message : "Unknown image analysis error";

    return {
      aiProbability: 0,
      humanProbability: 100,
      confidenceScore: 0,
      isAIGenerated: false,
      details: buildImageDetails({
        source: "image-metadata-fallback",
        provider: "Image Metadata Fallback",
        verdict: "Image model is not available or failed to run",
        predictedLabel: "Needs Review",
        aiProbability: 0,
        humanProbability: 100,
        confidenceScore: 0,
        fileName: fileName ?? null,
        imageProfile,
        labels: null,
        classProbabilities: [],
        modelStatus: {
          loaded: false,
          message,
        },
        message:
          "Image analysis could not be completed. Manual review is recommended.",
        warning:
          `Add ${MODEL_FILE_NAME} and ${LABELS_FILE_NAME} to models/, or set IMAGE_MODEL_PATH and IMAGE_LABELS_PATH for model-backed image detection.`,
      }),
    };
  }
};
