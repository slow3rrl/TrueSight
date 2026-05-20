import path from "path";
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

let loadedModel: tf.LayersModel | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clamp = (value: number, min = 0, max = 100): number => {
  return Math.min(max, Math.max(min, value));
};

const dataUrlToBuffer = (dataUrl?: string | null): Buffer | null => {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

  if (!base64) return null;

  return Buffer.from(base64, "base64");
};

const getModelPath = (): string => {
  const configuredPath = process.env.IMAGE_MODEL_PATH;

  if (configuredPath) {
    return configuredPath.startsWith("file://")
      ? configuredPath
      : `file://${path.resolve(configuredPath)}`;
  }

  return `file://${path.resolve(
    __dirname,
    "../models/image-detector/model.json",
  )}`;
};

const loadImageModel = async (): Promise<tf.LayersModel> => {
  if (loadedModel) return loadedModel;

  loadedModel = await tf.loadLayersModel(getModelPath());
  return loadedModel;
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
        source: "local-image-model",
        verdict: "No readable image found for analysis",
        fileName: fileName ?? null,
      },
    };
  }

  try {
    const model = await loadImageModel();
    const input = await preprocessImage(imageBuffer);

    const prediction = model.predict(input) as tf.Tensor;
    const values = Array.from(await prediction.data());

    input.dispose();
    prediction.dispose();

    const aiScoreRaw =
      values.length === 1
        ? values[0] * 100
        : Math.max(...values) * 100;

    const aiProbability = clamp(Number(aiScoreRaw.toFixed(2)));
    const humanProbability = Number((100 - aiProbability).toFixed(2));
    const confidenceScore = Number(
      Math.max(aiProbability, humanProbability).toFixed(2),
    );

    return {
      aiProbability,
      humanProbability,
      confidenceScore,
      isAIGenerated: aiProbability >= 60,
      details: {
        detectorType: "image",
        source: "local-image-model",
        verdict:
          aiProbability >= 60
            ? "Likely AI-generated image"
            : "Likely authentic or human-created image",
        aiProbability,
        humanProbability,
        confidenceScore,
        fileName: fileName ?? null,
        modelInputSize: "224x224",
        note: "Image result depends on the quality and balance of the trained dataset.",
      },
    };
  } catch (error: any) {
    return {
      aiProbability: 0,
      humanProbability: 100,
      confidenceScore: 0,
      isAIGenerated: false,
      details: {
        detectorType: "image",
        source: "local-image-model",
        verdict: "Image model is not available or failed to run",
        fileName: fileName ?? null,
        error: error?.message ?? "Unknown image analysis error",
      },
    };
  }
};