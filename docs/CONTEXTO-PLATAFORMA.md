# Contexto Tecnico e Operacional da Plataforma

Atualizado em: 2026-06-18  
Projeto: Universidade Corporativa / Academia Goiasa  
Repositorio: `aldemirfidelis/universidade-corp`  
Commit de referencia antes deste documento: `ebf6026 Evita timeout nas importacoes APDATA`

Este documento e a memoria tecnica do projeto. Ele existe para que futuras mudancas comecem com contexto suficiente: arquitetura, dominio, banco, fluxos principais, deploy, decisoes recentes, pontos de risco e comandos de operacao.

## 1. Visao Geral

A plataforma e um SaaS LMS multiempresa para universidade corporativa. Ela atende principalmente o fluxo da Goiasa, mas foi estruturada como produto multi-tenant:

- treinamento corporativo online;
- upload e streaming de videos;
- materiais de referencia por aula;
- progresso por colaborador;
- provas e tentativas;
- certificados com validacao publica;
- dashboards de aluno, gestor e administracao;
- relatorios com exportacao;
- matriz de treinamentos por cargo;
- importacao APDATA por planilhas Excel;
- auditoria de acoes;
- deploy em droplet Docker.

O repositorio e um monorepo PNPM com:

- `apps/api`: API NestJS.
- `apps/web`: Web Next.js App Router.
- `packages/shared`: enums e schemas compartilhados.

Stack principal:

- Node.js 20+.
- PNPM 9.7.0.
- NestJS 10.
- Prisma 5.
- PostgreSQL 16.
- Next.js 15.
- Tailwind CSS.
- Caddy como proxy reverso.
- Docker Compose em producao.

## 2. Estado Atual em Producao

Ambiente atual:

- Droplet DigitalOcean: `universidade-corp`.
- IP publico: `206.81.12.58`.
- Sistema: Ubuntu 22.04.
- App publico: `http://206.81.12.58`.
- API publica via mesma origem: `http://206.81.12.58/api/*`.
- Diretorio remoto: `/opt/universidade-corp`.
- O diretorio remoto atualmente e um clone Git.
- Compose de producao: `docker-compose.droplet.yml`.
- Proxy: `deploy/Caddyfile`.
- Banco: Postgres em container local na propria droplet.

Servicos Docker:

- `uc_postgres`: banco PostgreSQL 16.
- `uc_redis`: Redis.
- `uc_api`: API NestJS.
- `uc_web`: Next.js standalone.
- `uc_caddy`: reverse proxy.

A API roda `pnpm prisma migrate deploy` automaticamente no `CMD` do container antes de iniciar o servidor.

### 2.1 Acesso SSH

Nesta maquina de desenvolvimento foi identificado acesso direto usando a chave da BeeEyes:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@206.81.12.58
```

Tambem existe droplet do projeto Gestao 360:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@159.89.91.222
```

Esse segundo host apareceu como "beeyes" no contexto operacional de outro projeto, mas para este projeto o acesso direto ao IP `206.81.12.58` com a mesma chave funcionou.

Nunca commitar chaves SSH, `.env`, dumps de banco ou backups.

## 3. Estrutura do Repositorio

```text
.
|-- apps
|   |-- api
|   |   |-- prisma
|   |   |   |-- migrations
|   |   |   |-- schema.prisma
|   |   |   `-- seed.ts
|   |   |-- scripts
|   |   |   `-- dev-db.mjs
|   |   |-- src
|   |   |   |-- common
|   |   |   |-- modules
|   |   |   |-- prisma
|   |   |   |-- app.module.ts
|   |   |   `-- main.ts
|   |   `-- Dockerfile
|   |-- web
|   |   |-- app
|   |   |-- components
|   |   |-- lib
|   |   |-- public
|   |   |-- middleware.ts
|   |   `-- Dockerfile
|-- deploy
|   `-- Caddyfile
|-- packages
|   `-- shared
|       `-- src
|-- docker-compose.yml
|-- docker-compose.droplet.yml
|-- README.md
`-- ESCOPO-GOIASA.md
```

Arquivos importantes:

- `README.md`: setup local, credenciais demo, resumo de producao.
- `ESCOPO-GOIASA.md`: rastreabilidade do escopo funcional da Goiasa.
- `docs/CONTEXTO-PLATAFORMA.md`: este documento.
- `apps/api/prisma/schema.prisma`: modelo de dados.
- `apps/api/prisma/migrations/*`: historico de migrations.
- `apps/api/prisma/seed.ts`: dados demonstrativos.
- `apps/api/src/app.module.ts`: composicao dos modulos backend.
- `apps/web/app/*`: rotas e paginas frontend.
- `docker-compose.droplet.yml`: stack de producao.
- `deploy/Caddyfile`: proxy da droplet.

## 4. Scripts do Monorepo

Scripts principais no `package.json` da raiz:

```bash
pnpm install
pnpm shared:build
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm build
pnpm test
pnpm db:up
pnpm db:down
pnpm db:embedded
pnpm db:migrate
pnpm db:generate
pnpm db:seed
pnpm db:reset
```

Fluxo local recomendado:

```bash
pnpm install
pnpm shared:build
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Alternativa sem Docker local:

```bash
pnpm db:embedded
```

Esse comando sobe um Postgres local via `embedded-postgres` usando `apps/api/scripts/dev-db.mjs`.

## 5. Variaveis de Ambiente

Exemplos:

- `.env.example`.
- `.env.droplet.example`.

API (`apps/api/src/common/env.ts`):

- `NODE_ENV`.
- `PORT` ou `API_PORT`.
- `API_PREFIX`, padrao `api`.
- `API_CORS_ORIGIN`.
- `JWT_ACCESS_SECRET`.
- `JWT_REFRESH_SECRET`.
- `JWT_ACCESS_TTL`, padrao `15m`.
- `JWT_REFRESH_TTL`, padrao `7d`.
- `UPLOAD_DIR`, padrao `./uploads`.
- `MAX_UPLOAD_MB`, padrao `512`.
- `VIDEO_COMPLETION_THRESHOLD`, padrao `90`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- `GEMINI_API_KEY`.
- `DATABASE_URL`.
- `DIRECT_URL`.

Web:

- `NEXT_PUBLIC_API_URL`.

Em producao, o `docker-compose.droplet.yml` passa `NEXT_PUBLIC_API_URL` como build arg para o build da Web. Como o deploy atual usa origem unica via Caddy, o valor esperado e normalmente `http://206.81.12.58/api` ou URL equivalente com dominio.

## 6. Backend: Arquitetura NestJS

Ponto de entrada:

- `apps/api/src/main.ts`.

Configuracoes globais:

- Prefixo global: `env.apiPrefix`, geralmente `/api`.
- `helmet` com `crossOriginResourcePolicy: false`.
- JSON limit: `15mb`.
- URL encoded limit: `15mb`.
- CORS baseado em `API_CORS_ORIGIN`.
- `ValidationPipe` global com:
  - `whitelist: true`;
  - `transform: true`;
  - `forbidNonWhitelisted: false`.
- filtro global: `HttpExceptionFilter`.
- `trust proxy` habilitado.

Modulo raiz:

- `apps/api/src/app.module.ts`.

Guards/interceptors globais:

- `JwtAuthGuard`: autenticacao global por JWT.
- Rotas publicas usam `@Public()`.
- `AuditInterceptor`: registra mutacoes (`POST`, `PUT`, `PATCH`, `DELETE`) em `AuditLog`.

### 6.1 Multiempresa

O sistema foi desenhado para multi-tenant. A maioria das tabelas de negocio tem `companyId`.

Utilitario central:

- `apps/api/src/common/effective-company.ts`.

Ele determina a empresa efetiva do usuario autenticado. Em geral:

- usuario normal usa `companyId` do token;
- super admin pode trabalhar com contexto ativo quando suportado.

Cuidados:

- toda query de entidade de negocio deve filtrar `companyId`;
- nunca retornar dados de outra empresa;
- soft delete deve ser respeitado com `deletedAt: null`;
- relatorios e dashboards tambem precisam filtrar por empresa.

### 6.2 Autenticacao

Modulo:

- `apps/api/src/modules/auth`.

Endpoints:

- `POST /api/auth/login`.
- `POST /api/auth/first-access`.
- `POST /api/auth/forgot-password`.
- `POST /api/auth/reset-password`.
- `POST /api/auth/refresh`.
- `GET /api/auth/me`.

Caracteristicas:

- login por email, CPF ou matricula no mesmo campo `identifier`;
- senha com hash em `common/crypto.ts`;
- access token e refresh token JWT;
- refresh token fica armazenado em hash no usuario (`refreshTokenHash`);
- primeiro acesso por token de convite (`inviteToken`);
- reset por `resetToken`.

Status de acesso:

- `ACTIVE`.
- `INACTIVE`.
- `BLOCKED`.
- `PENDING`.

Se `BLOCKED`, login e recusado.

### 6.3 Autorizacao

Enums de papel:

- `SUPER_ADMIN`.
- `COMPANY_ADMIN`.
- `INSTRUCTOR`.
- `MANAGER`.
- `EMPLOYEE`.

Arquivos:

- `common/decorators/roles.decorator.ts`.
- `common/guards/roles.guard.ts`.

Rotas administrativas usam `@Roles(...)`.

Importante: `JwtAuthGuard` e global, mas `RolesGuard` e aplicado nos controllers que precisam de controle por perfil.

### 6.4 Auditoria

Arquivo:

- `apps/api/src/common/interceptors/audit.interceptor.ts`.

Modelo:

- `AuditLog`.

Registra:

- empresa;
- usuario;
- metodo HTTP;
- rota;
- parametros;
- IP;
- user-agent;
- data/hora.

Nao audita login/refresh sem usuario para evitar ruido e exposicao de segredo.

### 6.5 Modulos Backend

Modulos importados no `AppModule`:

- `PrismaModule`: Prisma Client.
- `AuditModule`: registro e consulta de auditoria.
- `MailModule`: envio de email, hoje usado de forma basica.
- `CompletionModule`: conclusao automatica de treinamento e certificado.
- `MatrixModule`: matriz de treinamentos por cargo.
- `ValidityModule`: classificacao de validade.
- `AuthModule`: login, tokens e usuario autenticado.
- `HealthModule`: health check.
- `PlatformAdminModule`: administracao SaaS.
- `CompaniesModule`: dados/configuracoes da empresa, departamentos e cargos.
- `UsersModule`: funcionarios, importacao CSV, convites e status.
- `CoursesModule`: treinamentos, modulos e aulas.
- `MediaModule`: upload e stream.
- `LearningModule`: experiencia do colaborador.
- `ClassesModule`: turmas.
- `AssessmentsModule`: avaliacoes e provas.
- `CertificatesModule`: certificados e validacao publica.
- `ReportsModule`: relatorios e exportacoes.
- `AiModule`: geracao com Gemini/fallback.
- `DashboardModule`: indicadores admin/gestor.
- `NotificationsModule`: notificacoes in-app.
- `ApdataModule`: importacao APDATA por Excel.

## 7. Backend: Mapa de Endpoints

Todos os endpoints abaixo ficam sob `/api`.

### 7.1 Health

- `GET /health`.

Retorna status da API e conexao com banco.

### 7.2 Auth

- `POST /auth/login`.
- `POST /auth/first-access`.
- `POST /auth/forgot-password`.
- `POST /auth/reset-password`.
- `POST /auth/refresh`.
- `GET /auth/me`.

### 7.3 Platform Admin

Modulo para super admin:

- `GET /platform-admin/companies`.
- `POST /platform-admin/companies`.
- `PATCH /platform-admin/companies/:id/status`.
- `PATCH /platform-admin/companies/:id/plan`.
- `GET /platform-admin/metrics`.
- `GET /platform-admin/plans`.
- `GET /platform-admin/audit`.

### 7.4 Companies

- `GET /companies/me`.
- `PATCH /companies/settings`.
- `GET /companies/departments`.
- `POST /companies/departments`.
- `DELETE /companies/departments/:id`.
- `GET /companies/positions`.
- `POST /companies/positions`.
- `DELETE /companies/positions/:id`.

### 7.5 Users

- `GET /users`.
- `GET /users/:id`.
- `POST /users`.
- `POST /users/import`.
- `PATCH /users/:id`.
- `PATCH /users/:id/status`.
- `POST /users/:id/resend-invite`.
- `DELETE /users/:id`.

### 7.6 Courses

- `GET /courses`.
- `GET /courses/:id`.
- `POST /courses`.
- `PATCH /courses/:id`.
- `POST /courses/:id/publish`.
- `POST /courses/:id/archive`.
- `DELETE /courses/:id`.
- `POST /courses/:id/modules`.
- `DELETE /courses/modules/:moduleId`.
- `POST /courses/modules/:moduleId/lessons`.
- `DELETE /courses/lessons/:lessonId`.

### 7.7 Media

- `POST /media/lessons/:lessonId/video`.
- `POST /media/lessons/:lessonId/material`.
- `POST /media/image`.
- `GET /media/stream/:lessonId`.
- `GET /media/file/*`.

Observacoes:

- videos usam upload em disco;
- streaming suporta range request;
- arquivos ficam em volume persistente em producao.

### 7.8 Learning

- `GET /learning/my-courses`.
- `GET /learning/dashboard`.
- `POST /learning/courses/:id/restart`.
- `GET /learning/courses/:id`.
- `POST /learning/lessons/:lessonId/progress`.
- `GET /learning/certificates`.

### 7.9 Classes

- `GET /classes`.
- `GET /classes/:id`.
- `POST /classes`.
- `POST /classes/:id/students`.

### 7.10 Matrix

- `GET /matrix`.
- `GET /matrix/position/:positionId`.
- `PUT /matrix/position/:positionId`.

### 7.11 Assessments e Exam

Configuracao/admin:

- `GET /assessments/course/:courseId`.
- `PUT /assessments/course/:courseId`.
- `POST /assessments/:assessmentId/questions`.
- `DELETE /assessments/questions/:questionId`.

Execucao/aluno:

- `GET /exam/course/:courseId/state`.
- `POST /exam/course/:courseId/start`.
- `POST /exam/attempts/:attemptId/submit`.

### 7.12 Certificates

- `GET /certificates`.
- `GET /certificates/validate/:code`.
- `GET /certificates/:id/pdf`.

Validacao publica tambem tem pagina Web em:

- `/validar/[code]`.

### 7.13 Reports

- `GET /reports/enrollments`.
- `GET /reports/by-department`.
- `GET /reports/export/enrollments.xlsx`.
- `GET /reports/export/enrollments.pdf`.
- `GET /reports/export/certificates.xlsx`.

### 7.14 Dashboard

- `GET /dashboard/overview`.
- `GET /dashboard/team`.

### 7.15 Notifications

- `GET /notifications`.
- `PATCH /notifications/:id/read`.

### 7.16 AI

- `POST /ai/course-outline`.
- `POST /ai/questions`.
- `POST /ai/certificate-text`.

Usa Gemini quando `GEMINI_API_KEY` existe; caso contrario, precisa manter fallback offline amigavel.

### 7.17 APDATA

- `POST /apdata/employees/import`.
- `POST /apdata/training-status/import`.
- `GET /apdata/pending`.
- `POST /apdata/pending/dispatch`.
- `GET /apdata/imports`.

Detalhes no capitulo APDATA.

## 8. Banco de Dados e Dominio

Schema:

- `apps/api/prisma/schema.prisma`.

Migrations atuais:

- `20260616000000_init`: base inicial.
- `20260617143151_goiasa_scope`: escopo Goiasa.
- `20260618093000_apdata_imports`: importacoes APDATA.

### 8.1 Enums

- `UserRole`.
- `CompanyStatus`.
- `RecordStatus`.
- `UserAccessStatus`.
- `CourseStatus`.
- `CourseModality`.
- `ProgressStatus`.
- `EnrollmentStatus`.
- `LessonType`.
- `QuestionType`.
- `AttemptStatus`.
- `CertificateStatus`.
- `NotificationType`.

Esses enums tambem existem em `packages/shared/src/enums.ts`. Sempre manter Prisma e shared sincronizados.

### 8.2 SaaS e Empresa

Modelos:

- `SubscriptionPlan`.
- `Company`.
- `CompanySettings`.

`CompanySettings` controla branding:

- nome da universidade;
- logo;
- capa;
- cor primaria;
- cor secundaria;
- parametros padrao de avaliacao/certificado;
- percentual minimo de video.

### 8.3 Usuarios e Estrutura Organizacional

Modelos:

- `User`.
- `Role`.
- `Permission`.
- `Department`.
- `Position`.
- `EmployeeGroup`.

Campos relevantes em `User`:

- `companyId`.
- `name`.
- `email`.
- `cpf`.
- `phone`.
- `registration` (matricula / Id Contratado na APDATA).
- `passwordHash`.
- `role`.
- `accessStatus`.
- `departmentId`.
- `positionId`.
- `area`.
- `unit`.
- `managerId`.
- `admissionDate`.
- `inviteToken`.
- `resetToken`.
- `refreshTokenHash`.
- `deletedAt`.

O `managerId` e usado no dashboard do gestor para escopo de equipe.

### 8.4 Treinamentos

Modelos:

- `Course`.
- `CourseModule`.
- `CourseLesson`.
- `LessonVideo`.
- `LessonMaterial`.
- `LearningPath`.
- `LearningPathCourse`.
- `TrainingMatrix`.

`Course` possui:

- `title`;
- `externalTrainingId`;
- `sourceSystem`;
- `code`;
- `revisionDate`;
- `description`;
- `objective`;
- `targetAudience`;
- `category`;
- `instructorId`;
- `departmentId`;
- `workloadHours`;
- `validityMonths`;
- `mandatory`;
- `modality`;
- `requiresExam`;
- `coverUrl`;
- `tags`;
- `startDate`;
- `dueDate`;
- `status`.

Treinamentos APDATA sao criados/atualizados com:

- `sourceSystem = 'APDATA'`;
- `externalTrainingId`;
- `code`;
- `mandatory = true`;
- `status = PUBLISHED`.

### 8.5 Matricula e Progresso

Modelos:

- `Enrollment`.
- `LessonProgress`.
- `CourseProgress`.

`Enrollment` representa a atribuicao de um curso a um usuario. Tem:

- `mandatory`;
- `status`;
- `dueDate`;
- `sourceSystem`;
- `sourceReferenceId`.

`LessonProgress` registra:

- segundos assistidos;
- total;
- percentual;
- ultima posicao;
- status;
- inicio/fim;
- IP;
- dispositivo.

`CourseProgress` agrega progresso do curso.

### 8.6 Turmas

Modelos:

- `Class`.
- `ClassStudent`.

Turmas permitem atribuir um curso a um conjunto de alunos.

### 8.7 Avaliacoes

Modelos:

- `Assessment`.
- `Question`.
- `QuestionOption`.
- `AssessmentAttempt`.
- `AssessmentAnswer`.

`QuestionType` suporta:

- `SINGLE_CHOICE`;
- `MULTIPLE_CHOICE`;
- `TRUE_FALSE`;
- `ESSAY`;
- `MATCHING`;
- `ORDERING`.

Atencao: a UI atual pode nao expor todos os tipos de forma completa; conferir pagina admin de prova antes de assumir suporte visual completo.

### 8.8 Certificados

Modelos:

- `CertificateTemplate`.
- `Certificate`.

`Certificate` possui:

- codigo unico;
- carga horaria;
- data de emissao;
- validade;
- status;
- caminho PDF.

### 8.9 Notificacoes

Modelo:

- `Notification`.

Tipos:

- novo curso;
- vencimento;
- prova;
- certificado;
- geral.

### 8.10 Auditoria

Modelo:

- `AuditLog`.

Grava mutacoes automaticamente via interceptor global.

### 8.11 APDATA

Modelos:

- `ApdataImportBatch`.
- `ApdataEmployee`.
- `ApdataTrainingStatus`.

Essas tabelas preservam a origem importada e fazem ponte entre planilhas, usuarios e cursos.

## 9. Frontend: Arquitetura Next.js

App:

- `apps/web`.

Tecnologias:

- Next.js App Router.
- React 18.
- Tailwind.
- TanStack Query.
- Lucide React.
- Sonner.
- Zod/React Hook Form em telas especificas.

### 9.1 Rotas por Grupo

Aluno:

- `apps/web/app/(aluno)/academia/page.tsx`.
- `apps/web/app/(aluno)/inicio/page.tsx`.
- `apps/web/app/(aluno)/meus-treinamentos/page.tsx`.
- `apps/web/app/(aluno)/treinamento/[id]/page.tsx`.
- `apps/web/app/(aluno)/prova/[courseId]/page.tsx`.
- `apps/web/app/(aluno)/meus-certificados/page.tsx`.
- `apps/web/app/(aluno)/ajuda/page.tsx`.

Admin:

- `apps/web/app/(admin)/admin/dashboard/page.tsx`.
- `apps/web/app/(admin)/admin/funcionarios/page.tsx`.
- `apps/web/app/(admin)/admin/importacoes/page.tsx`.
- `apps/web/app/(admin)/admin/matriz/page.tsx`.
- `apps/web/app/(admin)/admin/turmas/page.tsx`.
- `apps/web/app/(admin)/admin/treinamentos/page.tsx`.
- `apps/web/app/(admin)/admin/treinamentos/novo/page.tsx`.
- `apps/web/app/(admin)/admin/treinamentos/[id]/page.tsx`.
- `apps/web/app/(admin)/admin/treinamentos/[id]/prova/page.tsx`.
- `apps/web/app/(admin)/admin/certificados/page.tsx`.
- `apps/web/app/(admin)/admin/relatorios/page.tsx`.
- `apps/web/app/(admin)/admin/configuracoes/page.tsx`.

Gestor:

- `apps/web/app/gestor/dashboard/page.tsx`.

Platform admin:

- `apps/web/app/platform-admin/empresas/page.tsx`.

Publicas:

- `/login`.
- `/primeiro-acesso`.
- `/validar/[code]`.

### 9.2 Middleware

Arquivo:

- `apps/web/middleware.ts`.

Comportamento:

- se `/`, redireciona para `/inicio` se existir cookie `uc_token`, senao `/login`;
- protege rotas que nao sao publicas;
- rotas publicas:
  - `/login`;
  - `/primeiro-acesso`;
  - `/recuperar-senha`;
  - `/validar`.

### 9.3 Auth no Frontend

Arquivos:

- `apps/web/components/auth-context.tsx`.
- `apps/web/lib/auth.ts`.
- `apps/web/lib/api.ts`.

Fluxo:

- login salva tokens e usuario;
- `AuthProvider` consulta `/auth/me`;
- branding e aplicado nas CSS variables `--brand` e `--brand-dark`;
- logout limpa sessao e volta para login.

### 9.4 API Client

Arquivo:

- `apps/web/lib/api.ts`.

Recursos:

- `get`, `post`, `put`, `patch`, `del`;
- refresh automatico quando status `401`;
- upload por XHR com progresso.

Observacao importante:

- progresso de upload mede envio do arquivo, nao processamento no backend.
- Para APDATA, depois do ajuste recente, o backend responde rapidamente e processa em segundo plano.

### 9.5 Layouts

Admin:

- sidebar desktop;
- topbar mobile simples;
- menu inclui Dashboard, Funcionarios, Treinamentos, Importacoes, Matriz por Cargo, Turmas, Certificados, Relatorios, Configuracoes.

Aluno:

- header com branding;
- navegacao inferior mobile-first;
- menu: Academia, Inicio, Meus Treinamentos, Meus Certificados, Ajuda.

Gestor:

- layout proprio em `apps/web/app/gestor/layout.tsx`.

Platform admin:

- layout proprio em `apps/web/app/platform-admin/layout.tsx`.

### 9.6 PWA

Arquivos:

- `apps/web/public/manifest.webmanifest`.
- `apps/web/public/sw.js`.
- `apps/web/components/pwa-register.tsx`.

Ao testar mudancas em producao, considerar cache de PWA/service worker. Se o site "parece antigo", testar:

- reload forte;
- aba anonima;
- limpar dados do site;
- conferir build do container Web.

## 10. Fluxos Funcionais Principais

### 10.1 Login e Direcionamento

1. Usuario acessa `/login`.
2. Envia `identifier` e senha.
3. API verifica email, CPF ou matricula.
4. Front salva tokens.
5. Middleware passa a liberar rotas.
6. UI busca `/auth/me`.
7. Usuario navega para area conforme papel.

Papeis esperados:

- `SUPER_ADMIN`: plataforma.
- `COMPANY_ADMIN`: admin empresa.
- `MANAGER`: dashboard gestor.
- `INSTRUCTOR`: pode atuar em treinamentos.
- `EMPLOYEE`: area aluno.

### 10.2 Administrador Cria Treinamento

1. Admin acessa `/admin/treinamentos/novo`.
2. Cria `Course`.
3. Pode adicionar modulos e aulas.
4. Pode anexar video/material.
5. Pode configurar prova em `/admin/treinamentos/[id]/prova`.
6. Publica curso.
7. Curso pode ser atribuido por matriz, turma ou APDATA.

### 10.3 Upload e Streaming de Video

1. Admin envia arquivo em `POST /media/lessons/:lessonId/video`.
2. Arquivo e persistido no volume de uploads.
3. `LessonVideo` guarda caminho, mime, tamanho e duracao.
4. Aluno acessa aula.
5. Player consome `GET /media/stream/:lessonId`.
6. API suporta Range para mobile/navegador.
7. Progresso e enviado periodicamente para `/learning/lessons/:lessonId/progress`.

### 10.4 Progresso e Conclusao

1. Cada aula gera/atualiza `LessonProgress`.
2. O percentual considera tempo assistido e total.
3. O sistema nao deve concluir aula sem atingir minimo configurado.
4. `LearningService` recalcula progresso do curso.
5. Se curso nao exige prova, conclusao pode ser automatica.
6. Se curso exige prova, conclusao depende do fluxo de avaliacao.
7. `CompletionService` marca matricula concluida e emite certificado quando aplicavel.

### 10.5 Prova

1. Admin configura assessment e questoes.
2. Aluno acessa prova pelo curso.
3. API cria tentativa em `AssessmentAttempt`.
4. Submissao cria `AssessmentAnswer`.
5. Sistema calcula nota.
6. Se aprovado, curso pode ser concluido.
7. Se reprovado, notifica aluno conforme regra atual.

### 10.6 Certificado

1. Conclusao do curso gera `Certificate`.
2. Codigo unico permite validacao publica.
3. PDF e gerado em endpoint proprio.
4. Pagina `/validar/[code]` consulta status publico.

### 10.7 Matriz por Cargo

1. Admin acessa `/admin/matriz`.
2. Seleciona cargo.
3. Marca cursos obrigatorios.
4. Salva `TrainingMatrix`.
5. Ao criar/editar/importar usuario com cargo, `MatrixService.enrollUserMatrix` deve matricular automaticamente.

### 10.8 Turmas

1. Admin cria turma vinculada a curso.
2. Adiciona alunos.
3. Sistema cria `Enrollment` e notificacao.

### 10.9 Dashboards

Admin:

- `/admin/dashboard`;
- usa `/dashboard/overview`;
- indicadores globais da empresa.

Gestor:

- `/gestor/dashboard`;
- usa `/dashboard/team`;
- escopo por `managerId`.

Aluno:

- `/inicio`;
- usa `/learning/dashboard`;
- mostra pendentes, vencidos, concluidos e proximos.

### 10.10 Relatorios

Admin:

- `/admin/relatorios`;
- filtros por treinamento, cargo, setor, area, unidade, periodo, status;
- exportacao Excel/PDF.

## 11. APDATA: Contexto Completo

O APDATA foi implementado como fallback por planilhas Excel, pois nao ha integracao direta/API disponivel no ambiente.

Tela:

- `/admin/importacoes`.

API:

- `POST /api/apdata/employees/import`.
- `POST /api/apdata/training-status/import`.
- `GET /api/apdata/pending`.
- `POST /api/apdata/pending/dispatch`.
- `GET /api/apdata/imports`.

Arquivos:

- `apps/api/src/modules/apdata/apdata.controller.ts`.
- `apps/api/src/modules/apdata/apdata.service.ts`.
- `apps/web/app/(admin)/admin/importacoes/page.tsx`.
- migration `20260618093000_apdata_imports`.

### 11.1 Duas Bases

Base pai:

- planilha "Superior imediato";
- importada em `ApdataEmployee`;
- cria/atualiza `User`, `Position`, `Department`;
- define area, unidade, cargo, gestor e superior.

Base filha:

- planilha "Status dos treinamentos" / "Validade Treinamentos";
- importada em `ApdataTrainingStatus`;
- depende da base pai pelo `Id Contratado`;
- cria/atualiza `Course` APDATA;
- calcula pendencias.

Ordem correta:

1. Importar `Superior imediato`.
2. Aguardar fim do processamento.
3. Importar `Status dos treinamentos`.
4. Revisar agrupamentos.
5. Disparar pendencias.

### 11.2 Regra "Planilha e a Verdade"

Para colaboradores:

- se colaborador existe na planilha, cria/atualiza;
- se colaborador saiu da planilha e existe no banco, marca como inativo/soft delete;
- matriculas ativas desse colaborador podem ser canceladas para nao gerar pendencias indevidas.

Para status de treinamento:

- chave da pendencia: `Id Contratado + Id Evento`;
- se linha existe, cria/atualiza;
- se linha sumiu da planilha, marca `deletedAt`;
- matricula APDATA ativa relacionada pode ser cancelada.

### 11.3 Campos Lidos da Base Pai

Mapeamento principal:

- `Id Contratado` -> `externalEmployeeId` / `User.registration`.
- `Nome` -> `User.name`.
- `Cadastro de Pessoa Fisica` -> `User.cpf`.
- `Telefone Numero` -> `User.phone`.
- `Data da Admissao` -> `User.admissionDate`.
- `Cargo` -> `Position`.
- `Area de Atuacao` -> `User.area` e departamento preferencial.
- `Local` / `Folha` -> `User.unit`.
- `Superior Imediato` / `Gestor` -> vinculo `managerId` quando nome bate com outro colaborador.
- `Situacao` -> define ativo/inativo.

Email placeholder:

```text
apdata-{IdContratado}@goiasa.local
```

Essa decisao evita bloquear criacao por falta de email real.

### 11.4 Campos Lidos da Base Filha

Mapeamento principal:

- `Id Contratado`;
- `Nome`;
- `Situacao`;
- `Data da Admissao`;
- `Id Cargo`;
- `Cargo`;
- `Id Area de Atuacao`;
- `Area de Atuacao`;
- `Gestor`;
- `Superior`;
- `Folha`;
- `Id Evento`;
- `Evento`;
- `Data/Hora Inicio do Evento`;
- `Data/Hora Fim do Evento`;
- `Quantidade de Dias de Validade`;
- `Validade`;
- `Quantidade Carga Horaria Total`;
- `Status`;
- `Realizado`;
- `Dt Revisao`;
- `Num Ref Revisao`;
- `Validadt Revisao`;
- `Ajuste de Folha`.

### 11.5 Logica de Pendencia

Uma linha vira pendencia se:

- `Status` contem `vencido`;
- ou `Status` contem `proximo`;
- ou `Validadt Revisao` contem `desatualizado`.

Normalizacao remove acentos e compara em minusculo.

### 11.6 Cursos Criados pelo APDATA

Para cada `Id Evento`:

- procura `Course.externalTrainingId` ou `Course.code`;
- se existe, atualiza dados APDATA sem sobrescrever titulo se ja existe titulo;
- se nao existe, cria curso publicado;
- `sourceSystem = 'APDATA'`;
- `mandatory = true`;
- `requiresExam = true`;
- `modality = ONLINE`.

### 11.7 Disparo de Pendencias

Tela agrupa pendencias por:

- area;
- superior imediato;
- gestor.

Botao "Disparar" cria/atualiza:

- `Enrollment`;
- `Notification`.

Se uma matricula estava concluida, o fluxo APDATA pode zerar progresso para retreinamento quando necessario.

### 11.8 Importacao Assincrona

Mudanca recente:

- commit `ebf6026 Evita timeout nas importacoes APDATA`.

Motivo:

- planilhas grandes travavam no meio porque a request HTTP ficava esperando milhares de operacoes no banco;
- a barra de upload chegava a 100%, mas o backend ainda estava processando;
- isso parecia "travado" e podia esbarrar em timeout.

Comportamento atual:

- upload cria `ApdataImportBatch`;
- API responde rapidamente com `processing: true`;
- processamento roda em segundo plano;
- tela atualiza `/apdata/pending` a cada 5 segundos;
- enquanto existe importacao sem `finishedAt`, a tela mostra "Processando importacao";
- novo upload e disparo ficam bloqueados ate finalizar;
- progresso parcial e salvo no batch (`createdRows`, `updatedRows`, etc.);
- importacoes antigas abertas por mais de 12 horas sao encerradas como interrompidas.

Concorrencia:

- processamento em lotes com `IMPORT_CONCURRENCY = 10`;
- evita loop totalmente serial, mas tambem evita abrir concorrencia ilimitada contra o banco.

Limite de arquivo:

- Excel APDATA no controller: `250MB`;
- Caddy em producao: `600MB`.

### 11.9 Cuidados APDATA

Antes de mudar:

- entender colunas reais das planilhas;
- manter aliases de cabecalho em `HEADER_ALIASES` se a planilha vier com nome diferente;
- nao remover a regra "planilha e a verdade" sem alinhamento;
- nao disparar status antes de importar colaboradores;
- lembrar que emails sao placeholders;
- lembrar que gerente/superior por nome depende do nome bater com colaborador importado;
- APDATA cria cursos sem conteudo automaticamente; alguem precisa anexar videos/materiais/provas depois.

Troubleshooting:

- Se a tela mostra "Processando" por tempo demais, consultar `ApdataImportBatch` no banco.
- Ver logs da API: `docker compose -f docker-compose.droplet.yml logs -f api`.
- Se `finishedAt` ficou nulo por falha abrupta, a proxima importacao depois de 12h fecha como interrompida. Antes disso, pode ser necessario marcar manualmente em banco se houver certeza de que o processo morreu.

## 12. IA

Modulo:

- `apps/api/src/modules/ai`.

Uso:

- gerar estrutura de curso;
- gerar questoes;
- gerar texto de certificado.

Servico:

- `GeminiService`.

Variavel:

- `GEMINI_API_KEY`.

Regra pratica:

- sempre manter fallback quando nao houver chave;
- evitar depender de IA para fluxo critico de treinamento;
- respostas de IA devem ser revisadas por admin/instrutor.

## 13. Uploads e Armazenamento

API usa storage local em disco.

Arquivos:

- `apps/api/src/modules/media/storage.ts`.
- `apps/api/src/modules/media/media.service.ts`.
- `apps/api/src/modules/media/media.controller.ts`.

Em producao:

- volume Docker `uc_uploads`;
- montado em `/repo/apps/api/uploads`;
- nao deve ser apagado no deploy.

Deploy por `rsync` deve preservar:

- `.env`;
- `apps/api/uploads`.

No compose atual, uploads ficam no volume Docker, nao diretamente na pasta do repo, mas manter exclusoes em scripts de sincronizacao e uma protecao extra.

## 14. Deploy

### 14.1 Compose de Producao

Arquivo:

- `docker-compose.droplet.yml`.

Servicos:

- `postgres`.
- `redis`.
- `api`.
- `web`.
- `caddy`.

Volumes:

- `uc_pgdata`.
- `uc_redisdata`.
- `uc_uploads`.
- `uc_caddydata`.
- `uc_caddyconfig`.

API:

- Dockerfile em `apps/api/Dockerfile`;
- build gera shared, Prisma Client e Nest;
- runtime instala deps prod;
- runtime copia dist e prisma;
- roda `prisma generate`;
- `CMD`: `pnpm prisma migrate deploy && node dist/main.js`.

Web:

- Dockerfile em `apps/web/Dockerfile`;
- Next standalone;
- usa `NEXT_PUBLIC_API_URL` no build.

Caddy:

- `deploy/Caddyfile`;
- origem unica HTTP;
- `/api/*` para `uc_api:3333`;
- restante para `uc_web:3000`;
- `request_body max_size 600MB`.

### 14.2 Deploy Atual por Git

No servidor:

```bash
cd /opt/universidade-corp
git fetch origin main
git pull --ff-only origin main
docker compose -f docker-compose.droplet.yml build --no-cache api web
docker compose -f docker-compose.droplet.yml up -d --force-recreate api web caddy
docker compose -f docker-compose.droplet.yml ps
docker compose -f docker-compose.droplet.yml logs --tail=120 api
```

Se estiver a partir desta maquina:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@206.81.12.58
```

Ou comando remoto:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@206.81.12.58 "cd /opt/universidade-corp && git pull --ff-only origin main && docker compose -f docker-compose.droplet.yml up -d --build"
```

Para rebuild garantido:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@206.81.12.58 "cd /opt/universidade-corp && git fetch origin main && git pull --ff-only origin main && docker compose -f docker-compose.droplet.yml build --no-cache api web && docker compose -f docker-compose.droplet.yml up -d --force-recreate api web caddy"
```

### 14.3 Validacao Pos-Deploy

```bash
curl -fsS http://206.81.12.58/api/health
curl -I http://206.81.12.58/admin/importacoes
docker compose -f docker-compose.droplet.yml ps
docker compose -f docker-compose.droplet.yml logs --tail=120 api
docker compose -f docker-compose.droplet.yml logs --tail=80 web
```

Esperado:

- `/api/health` retorna `status: ok` e `db: up`;
- containers `uc_api`, `uc_web`, `uc_caddy`, `uc_postgres`, `uc_redis` em `Up`;
- logs da API incluem `Nest application successfully started`;
- logs da Web incluem `Ready`.

### 14.4 Backup

Antes de mudancas sensiveis:

```bash
cd /opt/universidade-corp
set -a
. ./.env
set +a
mkdir -p backups
docker compose -f docker-compose.droplet.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-unicorp}" "${POSTGRES_DB:-unicorp}" \
  > "backups/pre-change-$(date +%Y%m%d-%H%M%S).sql"
```

Pendencia operacional:

- criar backup automatico agendado;
- idealmente copiar para armazenamento externo.

## 15. Testes e Validacoes

Comandos usados com frequencia:

```bash
pnpm.cmd --filter @uc/shared build
pnpm.cmd --filter @uc/api build
pnpm.cmd --filter @uc/web build
pnpm.cmd --filter @uc/api test
pnpm.cmd --filter @uc/shared test
git diff --check
```

Observacoes:

- No Windows, `git diff --check` pode mostrar warnings de LF/CRLF; diferenciar warning de erro real.
- Se o Prisma Client local estiver desatualizado, rodar:

```bash
pnpm.cmd --filter @uc/api exec prisma generate
```

Se der erro `EPERM` em DLL do Prisma no Windows, algum processo Node esta segurando o client. Verificar:

```powershell
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId,CommandLine | Format-List
```

Parar apenas o processo local que esta segurando a API, quando seguro.

## 16. Convencoes de Implementacao

### 16.1 Backend

- Preferir modulos Nest existentes.
- Services concentram regra de negocio.
- Controllers devem ser finos.
- Toda query multiempresa deve usar `companyId`.
- Respeitar `deletedAt`.
- Usar schemas Zod compartilhados quando ja existirem.
- Regerar Prisma Client apos alterar schema.
- Criar migration Prisma para qualquer mudanca estrutural.
- Nao editar migration ja aplicada em producao; criar nova migration.
- Evitar importacoes pesadas sincronas em request HTTP.

### 16.2 Frontend

- Usar componentes existentes em `components/ui`.
- Usar `api` de `apps/web/lib/api.ts`.
- Usar TanStack Query para dados remotos.
- Respeitar layouts por papel.
- Evitar landing pages desnecessarias; telas devem ser funcionais.
- Em admin, manter interface densa e utilitaria.
- Em aluno, manter fluxo mobile-first.
- Cuidar para texto nao quebrar layout em mobile.

### 16.3 Banco

- Nomes seguem PascalCase nos modelos Prisma.
- Indices por `companyId` sao importantes.
- Relacoes principais usam cascade onde faz sentido.
- Soft delete e `deletedAt`.
- APDATA preserva dados brutos normalizados para rastreabilidade.

### 16.4 Deploy

- Nao apagar volumes Docker.
- Nao sobrescrever `.env` remoto.
- Conferir health apos deploy.
- Cuidado com cache PWA ao validar UI.
- Build Web incorpora `NEXT_PUBLIC_API_URL`; mudar API URL exige rebuild da Web.

## 17. Credenciais Demo

Senha padrao da seed:

```text
123456
```

Usuarios citados na documentacao:

- `super@demo.com`.
- `admin@goiasa.com`.
- `instrutor@goiasa.com`.
- `gestor@goiasa.com`.
- `maria@goiasa.com`.

Usar apenas para ambiente demo/desenvolvimento.

## 18. Pontos de Atencao e Riscos

### 18.1 APDATA

- Planilhas muito grandes podem exigir mais memoria/CPU.
- O processamento em segundo plano roda dentro do processo da API; se o container reiniciar, a importacao em andamento pode ficar incompleta.
- Nao existe fila persistente dedicada ainda.
- `ApdataImportBatch.finishedAt` e o indicador principal de fim.
- Se houver varias importacoes concorrentes por empresa, ha bloqueio para evitar inconsistencias.

Evolucao recomendada:

- fila com BullMQ/Redis;
- status detalhado por fase;
- endpoint dedicado `GET /apdata/imports/:id`;
- cancelamento de importacao;
- retry controlado;
- importacao streaming de Excel se os arquivos crescerem demais.

### 18.2 Videos

- Upload local depende de disco da droplet.
- Backup de volume de uploads ainda nao esta automatizado.
- Transcoding nao existe; ideal subir MP4 compativel com browser/mobile.

Evolucao recomendada:

- mover midia para S3/DigitalOcean Spaces;
- gerar thumbnails;
- validar codec/duracao no servidor;
- limitar tamanho por tipo.

### 18.3 Certificados

- Geracao PDF precisa ser validada visualmente apos alteracoes.
- QR/codigo publico nao deve expor dados sensiveis alem do necessario.

### 18.4 Auditoria

- Auditoria atual grava rota e params, nao body completo.
- Isso evita segredo, mas pode ser insuficiente para algumas trilhas.

Evolucao recomendada:

- registrar diffs sanitizados em entidades sensiveis;
- painel de consulta mais completo;
- exportacao de auditoria.

### 18.5 Multiempresa

- Maior risco tecnico: esquecer filtro por `companyId`.
- Testes devem cobrir isolamento quando novas features forem criadas.

### 18.6 PWA/Cache

- Service worker pode servir UI antiga.
- Em validacao manual, usar aba anonima/reload forte.

### 18.7 Permissoes

- O middleware Web so verifica existencia de token, nao papel.
- A protecao forte precisa permanecer no backend.
- Front deve esconder menus, mas API deve bloquear.

## 19. Futuras Mudancas: Onde Mexer

### 19.1 Nova Tela Admin

Provavel caminho:

- criar pagina em `apps/web/app/(admin)/admin/nome/page.tsx`;
- adicionar item no nav de `apps/web/app/(admin)/layout.tsx`;
- criar controller/service em `apps/api/src/modules/...`;
- adicionar modulo em `AppModule`;
- adicionar schema Zod em `packages/shared` se houver formulario compartilhado.

### 19.2 Novo Campo em Curso

Passos:

1. Editar `apps/api/prisma/schema.prisma`.
2. Criar migration Prisma.
3. Rodar `pnpm --filter @uc/api exec prisma generate`.
4. Atualizar schemas em `packages/shared/src/schemas.ts`.
5. Atualizar service/controller de courses.
6. Atualizar telas admin.
7. Atualizar relatorios se necessario.
8. Rodar builds/testes.

### 19.3 Novo Relatorio

Provavel caminho:

- `apps/api/src/modules/reports/reports.service.ts`;
- `apps/api/src/modules/reports/reports.controller.ts`;
- UI em `/admin/relatorios`;
- exportacao Excel com `exceljs`;
- PDF com `pdfkit`.

Cuidados:

- filtros por `companyId`;
- nao carregar tabelas gigantes sem necessidade;
- paginar se relatorio crescer.

### 19.4 Nova Regra de Conclusao

Provavel caminho:

- `LearningService`;
- `CompletionService`;
- `AssessmentsService`/`ExamController`, se envolver prova;
- `CompanySettings`, se for configuravel.

Cuidados:

- nao quebrar certificados ja emitidos;
- definir comportamento para retreinamento;
- atualizar dashboards.

### 19.5 Integracao Direta APDATA

Provavel caminho:

- manter `ApdataEmployee` e `ApdataTrainingStatus` como staging/espelho;
- criar cliente externo em modulo APDATA;
- transformar resposta da API externa para os mesmos `EmployeeRow` e `TrainingRow`;
- reaproveitar logica atual de processamento;
- registrar batches com tipo/origem diferenciada.

Cuidados:

- autenticacao segura;
- rate limit;
- retry;
- logs sanitizados;
- idempotencia;
- auditoria.

### 19.6 Envio de Email Real

Provavel caminho:

- `MailModule`;
- `NotificationsModule`;
- chamadas em Users, Classes, APDATA e Validity.

Cuidados:

- templates;
- SMTP em `.env`;
- nao bloquear request principal esperando SMTP;
- retries e logs.

## 20. Checklist Antes de Merge/Deploy

Antes de concluir uma mudanca:

- `git status --short` revisado.
- Nenhum segredo em diff.
- Prisma migration criada quando schema mudou.
- Prisma Client gerado.
- `pnpm --filter @uc/shared build`.
- `pnpm --filter @uc/api build`.
- `pnpm --filter @uc/web build`.
- `pnpm --filter @uc/api test`.
- `git diff --check`.
- Fluxo manual principal validado quando UI muda.

Antes de deploy:

- confirmar branch `main`;
- confirmar commit no GitHub;
- backup se mudanca tocar banco/dados;
- `git pull --ff-only` na droplet;
- rebuild de `api` e `web`;
- health check;
- logs API/Web;
- testar rota alterada.

## 21. Comandos Uteis

### 21.1 Local

```bash
pnpm install
pnpm shared:build
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Builds:

```bash
pnpm --filter @uc/shared build
pnpm --filter @uc/api build
pnpm --filter @uc/web build
```

Testes:

```bash
pnpm --filter @uc/api test
pnpm --filter @uc/shared test
```

Prisma:

```bash
pnpm --filter @uc/api exec prisma generate
pnpm --filter @uc/api exec prisma migrate dev --name nome_da_migration
pnpm --filter @uc/api exec prisma migrate deploy
pnpm --filter @uc/api exec prisma studio
```

### 21.2 Producao

Entrar:

```bash
ssh -i ~/.ssh/beeeyes_digitalocean root@206.81.12.58
```

Status:

```bash
cd /opt/universidade-corp
git log -1 --oneline
docker compose -f docker-compose.droplet.yml ps
docker compose -f docker-compose.droplet.yml logs --tail=120 api
docker compose -f docker-compose.droplet.yml logs --tail=80 web
```

Deploy:

```bash
cd /opt/universidade-corp
git fetch origin main
git pull --ff-only origin main
docker compose -f docker-compose.droplet.yml build --no-cache api web
docker compose -f docker-compose.droplet.yml up -d --force-recreate api web caddy
docker compose -f docker-compose.droplet.yml ps
```

Health:

```bash
curl -fsS http://206.81.12.58/api/health
```

Backup:

```bash
cd /opt/universidade-corp
set -a
. ./.env
set +a
mkdir -p backups
docker compose -f docker-compose.droplet.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-unicorp}" "${POSTGRES_DB:-unicorp}" \
  > "backups/backup-$(date +%Y%m%d-%H%M%S).sql"
```

## 22. Glossario do Dominio

- Academia Goiasa: instancia/branding da universidade corporativa para Goiasa.
- Colaborador: usuario `EMPLOYEE`.
- Gestor: usuario `MANAGER`, com subordinados via `User.managerId`.
- T&D/Admin: usuario `COMPANY_ADMIN`.
- Plataforma/Super admin: usuario `SUPER_ADMIN`.
- Treinamento: `Course`.
- Aula: `CourseLesson`.
- Modulo: `CourseModule`.
- Material: `LessonMaterial`.
- Matricula: `Enrollment`.
- Progresso de aula: `LessonProgress`.
- Progresso de curso: `CourseProgress`.
- Prova: `Assessment` + `AssessmentAttempt`.
- Certificado: `Certificate`.
- Matriz: `TrainingMatrix`.
- Base pai APDATA: `ApdataEmployee`.
- Base filha APDATA: `ApdataTrainingStatus`.
- Batch APDATA: `ApdataImportBatch`.

## 23. Resumo das Decisoes Recentes

1. A plataforma roda em origem unica via Caddy: Web e API no mesmo IP, API sob `/api`.
2. A pasta remota `/opt/universidade-corp` deve ser tratada como clone Git.
3. O deploy deve usar `git pull --ff-only` e rebuild Docker.
4. A API aplica migrations automaticamente no start.
5. APDATA usa Excel como fallback de integracao.
6. APDATA foi alterado para processamento assíncrono em background para evitar timeout.
7. Importacao APDATA deve ocorrer em ordem: base pai antes da base filha.
8. A planilha APDATA e fonte da verdade para remocao/inativacao.
9. Upload de Excel APDATA aceita ate 250MB na API e 600MB no Caddy.
10. Chave local usada para SSH da droplet: `~/.ssh/beeeyes_digitalocean`.

## 24. O Que Ainda Precisa de Evolucao

Prioridades tecnicas sugeridas:

- fila persistente para APDATA com Redis/BullMQ;
- backup automatico de Postgres e uploads;
- monitoramento de disco/memoria;
- envio de email transacional real;
- testes de isolamento multiempresa;
- testes de importacao APDATA com planilhas de amostra;
- painel de auditoria mais completo;
- armazenamento externo para videos;
- controle mais robusto contra seek em video no servidor;
- perguntas durante o video;
- integracao APDATA direta quando houver API/credenciais;
- integracao de assinatura eletronica se exigida.

## 25. Como Usar Este Documento em Futuras Sessoes

Ao iniciar uma mudanca:

1. Leia este arquivo.
2. Leia `README.md`.
3. Leia `ESCOPO-GOIASA.md` se a mudanca for funcional.
4. Leia os services/controllers do modulo afetado.
5. Confira o schema Prisma.
6. Faça mudancas pequenas e verificaveis.
7. Rode build/testes.
8. Atualize este documento se a decisao mudar arquitetura, deploy, banco ou fluxo APDATA.

