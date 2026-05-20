import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

type FileInput = {
  fileName?: string | null;
  fileType?: string | null;
  fileDataUrl?: string | null;
  contentText?: string | null;
};

const dataUrlToBuffer = (dataUrl?: string | null): Buffer | null => {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

  if (!base64) return null;

  return Buffer.from(base64, "base64");
};

const getExtension = (fileName?: string | null): string => {
  return String(fileName ?? "")
    .toLowerCase()
    .split(".")
    .pop() ?? "";
};

export const extractTextFromSubmissionFile = async ({
  fileName,
  fileType,
  fileDataUrl,
  contentText,
}: FileInput): Promise<string> => {
  if (contentText?.trim()) {
    return contentText.trim();
  }

  const buffer = dataUrlToBuffer(fileDataUrl);
  const extension = getExtension(fileName);
  const mime = String(fileType ?? "").toLowerCase();

  if (!buffer) {
    return "";
  }

  if (extension === "txt" || mime.includes("text/plain")) {
    return buffer.toString("utf-8").trim();
  }

 if (extension === "pdf" || mime.includes("application/pdf")) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  await parser.destroy();

  return String(result.text ?? "").trim();
}

  if (
    extension === "docx" ||
    mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return String(result.value ?? "").trim();
  }

  return "";
};

export const isImageSubmission = (fileName?: string | null, fileType?: string | null): boolean => {
  const extension = getExtension(fileName);
  const mime = String(fileType ?? "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(extension)
  );
};