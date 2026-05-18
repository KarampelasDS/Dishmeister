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

export async function canDecodeImageFile(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}
