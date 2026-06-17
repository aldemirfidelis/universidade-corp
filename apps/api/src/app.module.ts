import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { MailModule } from './modules/mail/mail.module';
import { CompletionModule } from './modules/completion/completion.module';
import { MatrixModule } from './modules/matrix/matrix.module';
import { ValidityModule } from './modules/validity/validity.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { MediaModule } from './modules/media/media.module';
import { LearningModule } from './modules/learning/learning.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    MailModule,
    CompletionModule,
    MatrixModule,
    ValidityModule,
    AuthModule,
    HealthModule,
    PlatformAdminModule,
    CompaniesModule,
    UsersModule,
    CoursesModule,
    MediaModule,
    LearningModule,
    ClassesModule,
    AssessmentsModule,
    CertificatesModule,
    ReportsModule,
    AiModule,
    DashboardModule,
    NotificationsModule,
  ],
  providers: [
    // JWT global; rotas públicas marcadas com @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Auditoria/rastreabilidade de todas as mutações.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
