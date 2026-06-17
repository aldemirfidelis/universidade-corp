import { describe, expect, it } from 'vitest';
import { isLessonVideoComplete, watchedPercent } from './index';

describe('watchedPercent', () => {
  it('retorna 0 quando o total é 0 ou inválido', () => {
    expect(watchedPercent(10, 0)).toBe(0);
    expect(watchedPercent(10, -5)).toBe(0);
  });

  it('arredonda e limita entre 0 e 100', () => {
    expect(watchedPercent(45, 100)).toBe(45);
    expect(watchedPercent(200, 100)).toBe(100);
    expect(watchedPercent(89.6, 100)).toBe(90);
  });
});

describe('isLessonVideoComplete', () => {
  it('só conclui ao atingir o threshold', () => {
    expect(isLessonVideoComplete(89, 100, 90)).toBe(false);
    expect(isLessonVideoComplete(90, 100, 90)).toBe(true);
    expect(isLessonVideoComplete(95, 100, 90)).toBe(true);
  });

  it('abrir o vídeo (0s) nunca conclui', () => {
    expect(isLessonVideoComplete(0, 600, 90)).toBe(false);
  });
});
