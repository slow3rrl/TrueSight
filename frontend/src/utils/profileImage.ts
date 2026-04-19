const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const isSupportedProfileImageType = (type: string) =>
  SUPPORTED_IMAGE_TYPES.has(type.toLowerCase());

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file."));
    };

    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

export const getDisplayInitials = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};
