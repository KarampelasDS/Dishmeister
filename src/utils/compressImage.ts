import imageCompression from "browser-image-compression";

export async function compressImage(file: File, mode: "recipe"): Promise<File> {
  console.log(mode);
  return imageCompression(file, {
    maxSizeMB: mode === "recipe" ? 1 : 0.3,
    maxWidthOrHeight: mode === "recipe" ? 1280 : 400,
    useWebWorker: true,
    fileType: "image/webp",
  });
}
