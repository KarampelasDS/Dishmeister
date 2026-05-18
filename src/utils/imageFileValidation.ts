import imageCompression from "browser-image-compression";

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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadImageFileFromObjectUrl(file: File) {
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

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("File read failed"));
      }
    };
    reader.readAsDataURL(file);
  });
}

async function loadImageFileFromDataUrl(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = dataUrl;
  });

  return image;
}

async function loadImageFile(file: File) {
  const delays = [0, 250, 750, 1500];
  let lastError: unknown = null;

  for (const delay of delays) {
    if (delay) await wait(delay);

    try {
      return await loadImageFileFromObjectUrl(file);
    } catch (err) {
      lastError = err;
    }

    try {
      return await loadImageFileFromDataUrl(file);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Image load failed");
}

export async function canDecodeImageFile(file: File) {
  try {
    const image = await loadImageFile(file);
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  } catch {
    return false;
  }
}

function isNearlyBlackCanvas(canvas: HTMLCanvasElement) {
  const sampleSize = 32;
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;

  const sampleContext = sampleCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sampleContext) return false;

  sampleContext.drawImage(canvas, 0, 0, sampleSize, sampleSize);

  const { data } = sampleContext.getImageData(0, 0, sampleSize, sampleSize);
  let darkPixels = 0;
  let visiblePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 8) continue;

    visiblePixels += 1;

    if (data[i] < 8 && data[i + 1] < 8 && data[i + 2] < 8) {
      darkPixels += 1;
    }
  }

  return visiblePixels > 0 && darkPixels / visiblePixels > 0.98;
}

function getNormalizedDimensions(sourceWidth: number, sourceHeight: number) {
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function assertCanvasIsUsable(canvas: HTMLCanvasElement) {
  if (isNearlyBlackCanvas(canvas)) {
    throw new Error("The selected image loaded as a blank black frame.");
  }
}

async function canvasToEditorFile(canvas: HTMLCanvasElement) {
  assertCanvasIsUsable(canvas);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );

  if (!blob) {
    throw new Error("We couldn't prepare that image for editing.");
  }

  return new File([blob], "editor-image.jpg", { type: "image/jpeg" });
}

async function normalizeImageFileWithBitmap(file: File) {
  if (!("createImageBitmap" in window)) {
    throw new Error("Bitmap image loading is not available.");
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
    resizeQuality: "high",
  });

  try {
    const { width, height } = getNormalizedDimensions(
      bitmap.width,
      bitmap.height,
    );
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
    context.drawImage(bitmap, 0, 0, width, height);

    return await canvasToEditorFile(canvas);
  } finally {
    bitmap.close();
  }
}

async function normalizeImageFileOnce(file: File) {
  const image = await loadImageFile(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("We couldn't read that image.");
  }

  const { width, height } = getNormalizedDimensions(sourceWidth, sourceHeight);

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

  return await canvasToEditorFile(canvas);
}

async function compressImageForEditor(file: File) {
  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1600,
    useWebWorker: false,
    fileType: "image/jpeg",
    initialQuality: 0.9,
  });
}

async function copyFileToMemory(file: File) {
  const buffer = await file.arrayBuffer();

  return new File([buffer], file.name || "selected-image", {
    type: file.type || "image/jpeg",
    lastModified: file.lastModified,
  });
}

function getImagePrepErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (
    /permission|could not be read|notreadable|reference to a file was acquired/i.test(
      message,
    )
  ) {
    return (
      "Your browser couldn't read that selected image. On Android/Samsung, " +
      "try choosing it from Files, downloading it locally first, or opening it " +
      "in Gallery and saving a copy before uploading."
    );
  }

  if (/blank black frame/i.test(message)) {
    return (
      "That image loaded as a blank frame on this device. Try saving a copy " +
      "of it from Gallery, then upload the copy."
    );
  }

  return message || "We couldn't prepare that image for editing.";
}

export async function normalizeImageFileForEditor(file: File) {
  let sourceFile = file;

  try {
    sourceFile = await copyFileToMemory(file);
  } catch (err) {
    throw new Error(getImagePrepErrorMessage(err));
  }

  const delays = [0, 150, 400, 900];
  let lastError: unknown = null;

  for (const delay of delays) {
    if (delay) await wait(delay);

    try {
      return await normalizeImageFileWithBitmap(sourceFile);
    } catch (err) {
      lastError = err;
    }

    try {
      return await normalizeImageFileOnce(sourceFile);
    } catch (err) {
      lastError = err;
    }

    try {
      const compressed = await compressImageForEditor(sourceFile);
      return await normalizeImageFileOnce(compressed);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(getImagePrepErrorMessage(lastError));
}
