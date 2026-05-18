const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export const SUPPORTED_IMAGE_ACCEPT = "image/jpeg, image/png, image/webp";

export function isSupportedImageFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    SUPPORTED_IMAGE_TYPES.has(file.type) ||
    SUPPORTED_IMAGE_EXTENSIONS.has(extension)
  );
}

async function loadImageFile(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function canDecodeImageFile(file: File) {
  try {
    const image = await loadImageFile(file);
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  } catch {
    return false;
  }
}

export async function normalizeImageFileForEditor(file: File) {
  const image = await loadImageFile(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("We couldn't read that image.");
  }

  const maxDimension = 2048;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: false,
  });

  if (!context) {
    throw new Error("We couldn't prepare that image for editing.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );

  if (!blob) {
    throw new Error("We couldn't prepare that image for editing.");
  }

  return new File([blob], "editor-image.jpg", { type: "image/jpeg" });
}
