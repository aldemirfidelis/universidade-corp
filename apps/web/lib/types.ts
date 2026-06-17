import { ProgressStatus } from '@uc/shared';

export type ValidityStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'NONE';

export interface MyCourse {
  enrollmentId: string;
  status: string;
  mandatory: boolean;
  dueDate: string | null;
  course: {
    id: string;
    title: string;
    code?: string | null;
    coverUrl: string | null;
    workloadHours: number | null;
    mandatory: boolean;
    requiresExam: boolean;
  };
  progress: number;
  progressStatus: ProgressStatus;
  validity: ValidityStatus;
  validUntil: string | null;
  needsRetraining: boolean;
}

export interface ColabDashboard {
  totals: { pendentes: number; concluidos: number; vencidos: number; proximosVencimentos: number };
  pendentes: MyCourse[];
  vencidos: MyCourse[];
  proximosVencimentos: MyCourse[];
  historico: MyCourse[];
}

export interface LessonView {
  id: string;
  title: string;
  type: string;
  mandatory: boolean;
  contentText: string | null;
  hasVideo: boolean;
  durationSeconds: number;
  materials: Array<{ id: string; title: string; path: string }>;
  status: ProgressStatus;
  watchedPercent: number;
  lastPositionSeconds: number;
}

export interface CoursePlayer {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  requiresExam: boolean;
  workloadHours: number | null;
  progress: number;
  status: ProgressStatus;
  modules: Array<{ id: string; title: string; lessons: LessonView[] }>;
}

export interface Certificate {
  id: string;
  code: string;
  workloadHours: number | null;
  issuedAt: string;
  validUntil: string | null;
  status: string;
  course: { title: string };
}
