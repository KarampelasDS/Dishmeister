import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/webp",
  });
}
