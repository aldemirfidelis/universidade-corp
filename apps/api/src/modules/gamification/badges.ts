/** Catálogo de conquistas (badges). O `icon` é o nome de um ícone lucide-react. */
export interface BadgeDef {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDef[] = [
  { code: 'FIRST_COURSE', name: 'Primeiro passo', description: 'Concluiu seu primeiro treinamento.', icon: 'Rocket' },
  { code: 'FIVE_COURSES', name: 'Em ritmo', description: 'Concluiu 5 treinamentos.', icon: 'Flame' },
  { code: 'TEN_COURSES', name: 'Veterano', description: 'Concluiu 10 treinamentos.', icon: 'Medal' },
  { code: 'PERFECT_EXAM', name: 'Nota máxima', description: 'Gabaritou uma prova.', icon: 'Star' },
  { code: 'STREAK_7', name: 'Constância', description: '7 dias seguidos de estudo.', icon: 'CalendarCheck' },
];

export const BADGE_BY_CODE = new Map(BADGES.map((b) => [b.code, b]));

/** Pontos acumulados necessários para atingir um nível (curva triangular suave). */
export function pointsForLevel(level: number): number {
  return 50 * level * (level - 1); // L1=0, L2=100, L3=300, L4=600, L5=1000...
}

export function levelFromPoints(points: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + points / 12.5)) / 2));
}

export interface LevelInfo {
  level: number;
  levelFloor: number;
  nextLevelAt: number;
  levelProgress: number; // 0..100 até o próximo nível
  pointsToNext: number;
}

export function levelInfo(points: number): LevelInfo {
  const level = levelFromPoints(points);
  const levelFloor = pointsForLevel(level);
  const nextLevelAt = pointsForLevel(level + 1);
  const span = nextLevelAt - levelFloor;
  const levelProgress = span > 0 ? Math.round(((points - levelFloor) / span) * 100) : 100;
  return { level, levelFloor, nextLevelAt, levelProgress, pointsToNext: Math.max(0, nextLevelAt - points) };
}
