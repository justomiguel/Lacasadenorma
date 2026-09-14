import { coverFrameSeekSeconds, VIDEO_COVER_FRAME } from "@/src/domain/video-cover";

const EXTRACT_TIMEOUT_MS = 10_000;
const JPEG_QUALITY = 0.85;

/**
 * Extrae el fotograma 10 de un video en el navegador (ADR-038).
 *
 * El servidor no trae ffmpeg. El admin ya exige JavaScript para insertar.
 * El JPEG se valida otra vez al llegar, por contenido (T6).
 */
export async function extractCoverFrame(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    await waitFor(video, "loadeddata");

    if (typeof video.requestVideoFrameCallback === "function") {
      await captureNthFrame(video);
    } else {
      await seekTo(video, coverFrameSeekSeconds(video.duration));
    }

    return await snapshot(video, file.name);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitFor(video: HTMLVideoElement, event: string): Promise<void> {
  return withTimeout(
    new Promise((resolve, reject) => {
      video.addEventListener(event, () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("No se pudo leer el video para extraer la portada.")),
        { once: true },
      );
    }),
  );
}

function captureNthFrame(video: HTMLVideoElement): Promise<void> {
  return withTimeout(
    new Promise((resolve, reject) => {
      let count = 0;
      let settled = false;

      const finish = (): void => {
        if (settled) {
          return;
        }

        settled = true;
        video.pause();
        resolve();
      };

      const onFrame: VideoFrameRequestCallback = () => {
        count += 1;

        if (count >= VIDEO_COVER_FRAME || video.ended) {
          finish();
          return;
        }

        video.requestVideoFrameCallback(onFrame);
      };

      video.addEventListener("ended", finish, { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("No se pudo leer el video para extraer la portada.")),
        { once: true },
      );
      video.requestVideoFrameCallback(onFrame);
      void video.play().catch(() => {
        reject(new Error("No se pudo reproducir el video para extraer la portada."));
      });
    }),
  );
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return withTimeout(
    new Promise((resolve, reject) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("No se pudo leer el video para extraer la portada.")),
        { once: true },
      );
      video.currentTime = seconds;
    }),
  );
}

async function snapshot(video: HTMLVideoElement, originalName: string): Promise<File> {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (width <= 0 || height <= 0) {
    throw new Error("El video no tiene un cuadro para usar de portada.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("No se pudo dibujar el fotograma de portada.");
  }

  context.drawImage(video, 0, 0, width, height);
  const blob = await canvasToJpeg(canvas);
  const base = originalName.replace(/\.[^.]+$/u, "");

  return new File([blob], `${base}-f${String(VIDEO_COVER_FRAME)}.jpg`, {
    type: "image/jpeg",
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("No se pudo guardar el fotograma de portada."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function withTimeout(task: Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Tardó demasiado extraer el fotograma de portada."));
    }, EXTRACT_TIMEOUT_MS);

    task.then(
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
