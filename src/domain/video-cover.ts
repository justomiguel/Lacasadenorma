/**
 * El fotograma que hace de portada de un video (ADR-038, FR-501).
 *
 * Es el décimo cuadro, 1-indexado: no es el segundo 10. El seek en segundos
 * es el respaldo para un navegador sin `requestVideoFrameCallback`; asume
 * 30 fps, que es lo que exporta un teléfono. Si el video dura menos, se
 * busca el último instante decodificable.
 */

export const VIDEO_COVER_FRAME = 10;

const FALLBACK_FPS = 30;

export function coverFrameSeekSeconds(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  const target = (VIDEO_COVER_FRAME - 1) / FALLBACK_FPS;
  const last = Math.max(0, durationSeconds - 0.001);

  return Math.min(target, last);
}
