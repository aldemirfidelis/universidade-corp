import { z } from 'zod';
import {
  CourseModality,
  CourseStatus,
  LessonType,
  QuestionType,
  UserRole,
} from './enums';

// ============ Auth ============
/** Login aceita e-mail, CPF ou matrícula no mesmo campo "identifier". */
export const loginSchema = z.object({
  identifier: z.string().min(3, 'Informe e-mail, CPF ou matrícula'),
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const firstAccessSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
export type FirstAccessInput = z.infer<typeof firstAccessSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = firstAccessSchema;

// ============ Company / Onboarding ============
export const companyOnboardingSchema = z.object({
  legalName: z.string().min(2, 'Informe a razão social'),
  tradeName: z.string().min(2, 'Informe o nome fantasia'),
  cnpj: z.string().min(11, 'CNPJ inválido'),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).optional().nullable(),
  responsibleName: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
});
export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;

export const companySettingsSchema = z.object({
  universityName: z.string().min(2).optional(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Cor inválida').optional(),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Cor inválida').optional(),
  // Conteúdo white-label da Academia.
  heroTitle: z.string().max(200).optional().nullable(),
  aboutText: z.string().max(2000).optional().nullable(),
  missionText: z.string().max(2000).optional().nullable(),
  visionText: z.string().max(2000).optional().nullable(),
  guidelines: z.array(z.string().min(1)).max(30).optional(),
  requireExamByDefault: z.boolean().optional(),
  defaultPassingScore: z.coerce.number().min(0).max(100).optional(),
  defaultAttempts: z.coerce.number().int().min(1).optional(),
  defaultCertificateValidityMonths: z.coerce.number().int().min(0).optional(),
  defaultWorkloadHours: z.coerce.number().min(0).optional(),
  videoCompletionThreshold: z.coerce.number().int().min(50).max(100).optional(),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

// ============ Users / Funcionários ============
export const createUserSchema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  email: z.string().email(),
  cpf: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  registration: z.string().optional().nullable(), // matrícula
  role: z.nativeEnum(UserRole).default(UserRole.EMPLOYEE),
  departmentId: z.string().optional().nullable(), // Setor
  positionId: z.string().optional().nullable(), // Cargo
  area: z.string().optional().nullable(), // Área
  unit: z.string().optional().nullable(), // Unidade
  managerId: z.string().optional().nullable(),
  admissionDate: z.coerce.date().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============ Courses / Treinamentos ============
export const createCourseSchema = z.object({
  title: z.string().min(2, 'Informe o título'),
  code: z.string().optional().nullable(),
  revisionDate: z.coerce.date().optional().nullable(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  instructorId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  workloadHours: z.coerce.number().min(0).optional().nullable(),
  validityMonths: z.coerce.number().int().min(0).optional().nullable(),
  mandatory: z.boolean().default(false),
  modality: z.nativeEnum(CourseModality).default(CourseModality.ONLINE),
  requiresExam: z.boolean().default(false),
  coverUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  prerequisiteCourseIds: z.array(z.string()).default([]),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.nativeEnum(CourseStatus).optional(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const createModuleSchema = z.object({
  title: z.string().min(1, 'Informe o título do módulo'),
  description: z.string().optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
});
export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Informe o título da aula'),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(LessonType).default(LessonType.VIDEO),
  order: z.coerce.number().int().min(0).default(0),
  mandatory: z.boolean().default(true),
  contentText: z.string().optional().nullable(),
  externalUrl: z.string().url('URL inválida').optional().nullable(),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// ============ Learning Paths / Trilhas ============
export const learningPathSchema = z.object({
  title: z.string().min(2, 'Informe o título da trilha'),
  description: z.string().optional().nullable(),
  mandatory: z.boolean().optional(),
});
export type LearningPathInput = z.infer<typeof learningPathSchema>;

export const learningPathCoursesSchema = z.object({
  courseIds: z.array(z.string()).default([]),
});
export type LearningPathCoursesInput = z.infer<typeof learningPathCoursesSchema>;

// ============ Progresso ============
export const lessonProgressSchema = z.object({
  watchedSeconds: z.coerce.number().min(0),
  totalSeconds: z.coerce.number().min(0),
  /** posição atual em segundos para "retomar de onde parou" */
  lastPositionSeconds: z.coerce.number().min(0).optional(),
});
export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;

// ============ Turmas ============
export const createClassSchema = z.object({
  name: z.string().min(2, 'Informe o nome da turma'),
  courseId: z.string().min(1),
  instructorId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  studentIds: z.array(z.string()).default([]),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

// ============ Provas (Fase 3) ============
export const assessmentConfigSchema = z.object({
  title: z.string().min(2).default('Avaliação'),
  description: z.string().optional().nullable(),
  passingScore: z.coerce.number().min(0).max(100).default(70),
  maxAttempts: z.coerce.number().int().min(1).default(3),
  timeLimitMin: z.coerce.number().int().min(0).optional().nullable(),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  showResult: z.boolean().default(true),
  showAnswers: z.boolean().default(false),
});
export type AssessmentConfigInput = z.infer<typeof assessmentConfigSchema>;

export const createQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  statement: z.string().min(1, 'Informe o enunciado'),
  weight: z.coerce.number().min(0.1).default(1),
  imageUrl: z.string().optional().nullable(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean().default(false),
      }),
    )
    .min(2, 'Informe ao menos 2 alternativas'),
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// ============ Matriz de treinamentos por cargo (Goiasa) ============
export const trainingMatrixSchema = z.object({
  positionId: z.string().min(1),
  courseIds: z.array(z.string()).default([]),
});
export type TrainingMatrixInput = z.infer<typeof trainingMatrixSchema>;

export const submitExamSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionIds: z.array(z.string()).default([]),
      essayText: z.string().optional().nullable(),
    }),
  ),
});
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
