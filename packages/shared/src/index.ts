export * from './enums';
export * from './schemas';

/** Calcula o percentual assistido (0-100) de forma segura. */
export function watchedPercent(watchedSeconds: number, totalSeconds: number): number {
  if (!totalSeconds || totalSeconds <= 0) return 0;
  const pct = (watchedSeconds / totalSeconds) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Regra de conclusão de aula em vídeo: assistiu >= threshold (%). */
export function isLessonVideoComplete(
  watchedSeconds: number,
  totalSeconds: number,
  threshold = 90,
): boolean {
  return watchedPercent(watchedSeconds, totalSeconds) >= threshold;
}
