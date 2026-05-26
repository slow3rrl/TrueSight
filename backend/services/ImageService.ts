import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";

type ImageAnalysisResult = {
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  isAIGenerated: boolean;
  details: Record<string, unknown>;
};

type ImageModelBundle = {
  model: tf.LayersModel;
  labels: string[] | null;
};

type ModelJson = {
  modelTopology: unknown;
  weightsManifest?: Array<{
    paths: string[];
    weights: tf.io.WeightsManifestEntry[];
  }>;
  trainingConfig?: tf.io.TrainingConfig;
  userDefinedMetadata?: Record<string, unknown>;
};

let loadedModelBundle: ImageModelBundle | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clamp = (value: number, min = 0, max = 100): number => {
  return Math.min(max, Math.max(min, value));
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

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
};

const getModelPath = (): string => {
  const configuredPath = process.env.IMAGE_MODEL_PATH;

  if (configuredPath) {
    const filePath = configuredPath.startsWith("file://")
      ? fileURLToPath(configuredPath)
      : configuredPath;

    const resolvedPath = path.resolve(filePath);
    return path.extname(resolvedPath).toLowerCase() === ".json"
      ? resolvedPath
      : path.join(resolvedPath, "model.json");
  }

  return path.resolve(
    __dirname,
    "../models/image_model/model.json",
  );
};

const loadClassLabels = async (modelDirectory: string): Promise<string[] | null> => {
  try {
    const metadataPath = path.join(modelDirectory, "metadata.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    return Array.isArray(metadata?.labels)
      ? metadata.labels.map((label: unknown) => String(label))
      : null;
  } catch {
    return null;
  }
};

const loadImageModel = async (): Promise<ImageModelBundle> => {
  if (loadedModelBundle) return loadedModelBundle;

  const modelPath = getModelPath();
  const modelDirectory = path.dirname(modelPath);
  const modelJson = JSON.parse(await fs.readFile(modelPath, "utf-8")) as ModelJson;
  const weightsManifest = modelJson.weightsManifest ?? [];

  if (!modelJson.modelTopology || weightsManifest.length === 0) {
    throw new Error(
      "Invalid image model. Expected TensorFlow.js model.json with modelTopology and weightsManifest.",
    );
  }

  const weightSpecs = weightsManifest.flatMap((group) => group.weights);
  const weightData = tf.io.concatenateArrayBuffers(
    await Promise.all(
      weightsManifest.flatMap((group) =>
        group.paths.map(async (relativePath) => {
          const weightPath = path.resolve(modelDirectory, relativePath);
          return bufferToArrayBuffer(await fs.readFile(weightPath));
        }),
      ),
    ),
  );

  const model = await tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson.modelTopology,
      weightSpecs,
      weightData,
      trainingConfig: modelJson.trainingConfig,
      userDefinedMetadata: modelJson.userDefinedMetadata,
    }),
  );

  loadedModelBundle = {
    model,
    labels: await loadClassLabels(modelDirectory),
  };

  return loadedModelBundle;
};

const preprocessImage = async (imageBuffer: Buffer): Promise<tf.Tensor4D> => {
  const resized = await sharp(imageBuffer)
    .resize(224, 224)
    .removeAlpha()
    .raw()
    .toBuffer();

  const tensor = tf.tensor3d(new Uint8Array(resized), [224, 224, 3]);
  const normalized = tensor.div(255);
  const batched = normalized.expandDims(0) as tf.Tensor4D;

  tensor.dispose();
  normalized.dispose();

  return batched;
};

const getClassProbabilities = (
  values: number[],
  labels: string[] | null,
): Array<{ label: string; probability: number }> => {
  return values.map((value, index) => ({
    label: labels?.[index] ?? `Class ${index + 1}`,
    probability: clamp(Number((value * 100).toFixed(2))),
  }));
};

const findAiClassIndex = (labels: string[] | null): number | null => {
  if (!labels?.length) return null;

  const aiPattern = /\b(ai|artificial|generated|synthetic|fake)\b/i;
  const humanPattern = /\b(human|real|authentic|original|non-ai|non ai)\b/i;

  const aiIndex = labels.findIndex(
    (label) => aiPattern.test(label) && !humanPattern.test(label),
  );

  if (aiIndex >= 0) return aiIndex;

  const humanIndex = labels.findIndex((label) => humanPattern.test(label));
  return labels.length === 2 && humanIndex >= 0 ? 1 - humanIndex : null;
};

const getAiProbability = (values: number[], labels: string[] | null): number => {
  if (values.length === 1) {
    return (values[0] ?? 0) * 100;
  }

  const aiClassIndex = findAiClassIndex(labels);
  const selectedValue =
    aiClassIndex !== null ? values[aiClassIndex] ?? 0 : Math.max(...values, 0);

  return selectedValue * 100;
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
  fileName,
  imageProfile,
  labels,
  classProbabilities,
  modelStatus,
  warning,
}: {
  source: string;
  provider: string;
  verdict: string;
  aiProbability: number;
  humanProbability: number;
  confidenceScore: number;
  fileName?: string | null;
  imageProfile?: Record<string, unknown> | null;
  labels?: string[] | null;
  classProbabilities?: Array<{ label: string; probability: number }>;
  modelStatus: Record<string, unknown>;
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
    confidenceLevel: getConfidenceLevel(confidenceScore),
    riskBand: getRiskBand(aiProbability),
    fileName: fileName ?? null,
    modelInputSize: "224x224",
    classLabels: labels ?? null,
    classProbabilities: classProbabilities ?? [],
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
        label: "Authentic probability",
        value: humanProbability,
        unit: "%",
        tone: humanProbability >= 60 ? "calm" : "risk",
        description: "Inverse estimate that the image is authentic or human-created.",
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
          "Image detection is strongest when a trained TensorFlow.js model is available.",
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
    const imageProfile = await inspectImage(imageBuffer);
    const { model, labels } = await loadImageModel();
    const input = await preprocessImage(imageBuffer);

    const prediction = model.predict(input) as tf.Tensor;
    const values = Array.from(await prediction.data());

    input.dispose();
    prediction.dispose();

    const aiScoreRaw = getAiProbability(values, labels);

    const aiProbability = clamp(Number(aiScoreRaw.toFixed(2)));
    const humanProbability = Number((100 - aiProbability).toFixed(2));
    const confidenceScore = Number(
      Math.max(aiProbability, humanProbability).toFixed(2),
    );
    const classProbabilities = getClassProbabilities(values, labels);

    return {
      aiProbability,
      humanProbability,
      confidenceScore,
      isAIGenerated: aiProbability >= 60,
      details: buildImageDetails({
        source: "local-image-model",
        provider: "Local TensorFlow.js Image Model",
        verdict:
          aiProbability >= 60
            ? "Likely AI-generated image"
            : "Likely authentic or human-created image",
        aiProbability,
        humanProbability,
        confidenceScore,
        fileName: fileName ?? null,
        imageProfile,
        labels,
        classProbabilities,
        modelStatus: {
          loaded: true,
          message: "Local TensorFlow.js image model loaded and returned class probabilities.",
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
        warning:
          "Add a TensorFlow.js model at IMAGE_MODEL_PATH or backend/models/image_model/model.json for model-backed image detection.",
      }),
    };
  }
};
