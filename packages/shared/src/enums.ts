// =====================================================
// Enums compartilhados entre API e Web.
// Devem espelhar os enums do schema.prisma.
// =====================================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CompanyStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;
export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const RecordStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export const UserAccessStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  PENDING: 'PENDING',
} as const;
export type UserAccessStatus = (typeof UserAccessStatus)[keyof typeof UserAccessStatus];

export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export const CourseModality = {
  ONLINE: 'ONLINE',
  PRESENTIAL: 'PRESENTIAL',
  HYBRID: 'HYBRID',
} as const;
export type CourseModality = (typeof CourseModality)[keyof typeof CourseModality];

export const ProgressStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];

export const EnrollmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const LessonType = {
  VIDEO: 'VIDEO',
  TEXT: 'TEXT',
  MATERIAL: 'MATERIAL',
  EXTERNAL: 'EXTERNAL',
} as const;
export type LessonType = (typeof LessonType)[keyof typeof LessonType];

export const QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  ESSAY: 'ESSAY',
  MATCHING: 'MATCHING',
  ORDERING: 'ORDERING',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const CertificateStatus = {
  VALID: 'VALID',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type CertificateStatus = (typeof CertificateStatus)[keyof typeof CertificateStatus];

export const NotificationType = {
  NEW_COURSE: 'NEW_COURSE',
  DUE_SOON: 'DUE_SOON',
  OVERDUE: 'OVERDUE',
  EXAM_AVAILABLE: 'EXAM_AVAILABLE',
  EXAM_FAILED: 'EXAM_FAILED',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  CERTIFICATE_EXPIRING: 'CERTIFICATE_EXPIRING',
  CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
  GENERAL: 'GENERAL',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Rótulos amigáveis (pt-BR) para exibição na UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMPANY_ADMIN: 'Administrador da Empresa',
  INSTRUCTOR: 'Instrutor',
  MANAGER: 'Gestor',
  EMPLOYEE: 'Funcionário',
};

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  NOT_STARTED: 'Não iniciado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
};
