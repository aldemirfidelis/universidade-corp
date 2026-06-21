import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (s: string) => bcrypt.hash(s, 10);

async function main() {
  console.log('🌱 Seed: Universidade Corporativa');

  // ---- Plano ----
  const plan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter',
      slug: 'starter',
      maxUsers: 100,
      maxStorageMb: 10240,
      maxCourses: 50,
      priceCents: 0,
    },
  });

  // ---- Empresa demo ----
  const cnpj = '12345678000199';
  let company = await prisma.company.findFirst({ where: { cnpj } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        legalName: 'Goiasa Agroindustrial S/A',
        tradeName: 'Goiasa',
        cnpj,
        email: 'rh@goiasa.com.br',
        segment: 'Indústria de Alimentos',
        employeeCount: 500,
        responsibleName: 'Equipe de T&D',
        planId: plan.id,
        settings: {
          create: {
            universityName: 'Academia Goiasa',
            primaryColor: '#15803d',
            secondaryColor: '#064e3b',
            videoCompletionThreshold: 90,
            defaultWorkloadHours: 4,
            heroTitle: 'Conhecimento que transforma, segurança que protege e qualidade que gera resultados.',
            aboutText:
              'Este é o espaço dedicado ao seu desenvolvimento profissional. Aqui você terá acesso aos treinamentos, conteúdos e programas que fortalecem nossas competências, promovem a segurança, garantem a qualidade dos processos e contribuem para a construção de resultados cada vez melhores.',
            missionText:
              'Produzir e fornecer energia renovável ao menor custo, com excelência no serviço e em harmonia com a comunidade e o meio ambiente.',
            visionText:
              'Ser referência no setor como empresa de elevado retorno ao acionista aliado à responsabilidade social.',
            guidelines: [
              'Mitigar riscos relacionados à Saúde e Segurança do Trabalho;',
              'Proteger o meio ambiente através de ações que previnam a poluição, preservem a fauna, a flora e os recursos naturais;',
              'Controlar os perigos relacionados à Qualidade e Segurança de Alimentos, atendendo aos requisitos legais, de Clientes e do Sistema de Gestão;',
              'Assegurar a fidelidade e satisfação dos Clientes;',
              'Garantir a eficácia dos processos internos assegurando a consulta e participação dos Colaboradores;',
              'Incentivar a evolução contínua da competência dos Colaboradores;',
              'Garantir que as vagas sejam preenchidas, preferencialmente, através de seleção interna;',
              'Promover a diversidade, proporcionar a equidade e assegurar a inclusão;',
              'Promover a avaliação, comunicação e atendimento dos requisitos do Sistema Integrado de Gestão;',
              'Assegurar a comunicação com a comunidade.',
            ],
          },
        },
      },
    });
  }
  const companyId = company.id;

  // ---- Departamentos e cargos ----
  const [prod, qual, rh] = await Promise.all([
    upsertDepartment(companyId, 'Produção'),
    upsertDepartment(companyId, 'Qualidade'),
    upsertDepartment(companyId, 'Recursos Humanos'),
  ]);
  const [operador, analista] = await Promise.all([
    upsertPosition(companyId, 'Operador de Produção'),
    upsertPosition(companyId, 'Analista de Qualidade'),
  ]);

  // ---- Usuários ----
  const pwd = await hash('123456');
  const superAdmin = await upsertUser(companyId, {
    name: 'Super Admin',
    email: 'super@demo.com',
    role: 'SUPER_ADMIN',
    passwordHash: pwd,
  });
  const admin = await upsertUser(companyId, {
    name: 'Admin Goiasa',
    email: 'admin@goiasa.com',
    role: 'COMPANY_ADMIN',
    passwordHash: pwd,
  });
  const instrutor = await upsertUser(companyId, {
    name: 'Carla Instrutora',
    email: 'instrutor@goiasa.com',
    role: 'INSTRUCTOR',
    passwordHash: pwd,
    departmentId: qual.id,
  });
  const gestor = await upsertUser(companyId, {
    name: 'Gestor Produção',
    email: 'gestor@goiasa.com',
    role: 'MANAGER',
    passwordHash: pwd,
    departmentId: prod.id,
    area: 'Industrial',
    unit: 'Unidade I',
  });
  const employees = await Promise.all([
    upsertUser(companyId, { name: 'Maria Silva', email: 'maria@goiasa.com', role: 'EMPLOYEE', passwordHash: pwd, departmentId: prod.id, positionId: operador.id, area: 'Industrial', unit: 'Unidade I', managerId: gestor.id }),
    upsertUser(companyId, { name: 'João Souza', email: 'joao@goiasa.com', role: 'EMPLOYEE', passwordHash: pwd, departmentId: prod.id, positionId: operador.id, area: 'Industrial', unit: 'Unidade I', managerId: gestor.id }),
    upsertUser(companyId, { name: 'Ana Costa', email: 'ana@goiasa.com', role: 'EMPLOYEE', passwordHash: pwd, departmentId: qual.id, positionId: analista.id, area: 'Qualidade', unit: 'Unidade I', managerId: gestor.id }),
  ]);

  // ---- Treinamento: Segurança dos Alimentos ----
  let course = await prisma.course.findFirst({
    where: { companyId, title: 'Segurança dos Alimentos' },
  });
  if (!course) {
    course = await prisma.course.create({
      data: {
        companyId,
        title: 'Segurança dos Alimentos',
        code: 'TR-SA-001',
        revisionDate: new Date(),
        description: 'Boas Práticas de Fabricação para a indústria alimentícia.',
        objective: 'Capacitar os colaboradores em higiene, contaminação e sanitização.',
        category: 'Segurança dos Alimentos',
        instructorId: instrutor.id,
        departmentId: qual.id,
        workloadHours: 4,
        validityMonths: 12,
        mandatory: true,
        requiresExam: false,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdBy: admin.id,
      },
    });
    const mod = await prisma.courseModule.create({
      data: { companyId, courseId: course.id, title: 'Boas Práticas de Fabricação', order: 0 },
    });
    const titles = ['Higiene pessoal', 'Controle de contaminação', 'Limpeza e sanitização'];
    for (const [i, title] of titles.entries()) {
      await prisma.courseLesson.create({
        data: {
          companyId,
          courseId: course.id,
          moduleId: mod.id,
          title,
          type: 'VIDEO',
          order: i,
          mandatory: true,
          contentText: `Conteúdo da aula "${title}". (Vídeo de exemplo — use "Concluir aula" para simular a visualização.)`,
        },
      });
    }
  }

  // ---- Matriz de Treinamentos por cargo ----
  // Operador de Produção -> Segurança dos Alimentos (obrigatório por cargo).
  const existingMatrix = await prisma.trainingMatrix.findFirst({
    where: { companyId, positionId: operador.id, courseId: course.id },
  });
  if (!existingMatrix) {
    await prisma.trainingMatrix.create({
      data: { companyId, positionId: operador.id, courseId: course.id },
    });
  }

  // ---- Turma + matrículas ----
  let turma = await prisma.class.findFirst({ where: { companyId, name: 'Turma 2026 - Produção' } });
  if (!turma) {
    turma = await prisma.class.create({
      data: {
        companyId,
        name: 'Turma 2026 - Produção',
        courseId: course.id,
        instructorId: instrutor.id,
        dueDate: new Date(Date.now() + 30 * 24 * 3600_000),
        createdBy: admin.id,
      },
    });
    for (const emp of employees) {
      await prisma.classStudent.create({
        data: { companyId, classId: turma.id, userId: emp.id },
      });
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: emp.id, courseId: course.id } },
        create: { companyId, userId: emp.id, courseId: course.id, classId: turma.id, mandatory: true, dueDate: turma.dueDate },
        update: {},
      });
    }
  }

  console.log('\n✅ Seed concluído. Credenciais (senha: 123456):');
  console.table([
    { papel: 'Super Admin', login: 'super@demo.com' },
    { papel: 'Admin (T&D)', login: 'admin@goiasa.com' },
    { papel: 'Instrutor', login: 'instrutor@goiasa.com' },
    { papel: 'Gestor', login: 'gestor@goiasa.com' },
    { papel: 'Colaborador', login: 'maria@goiasa.com' },
    { papel: 'Colaborador', login: 'joao@goiasa.com' },
    { papel: 'Colaborador', login: 'ana@goiasa.com' },
  ]);
  void superAdmin;
}

async function upsertDepartment(companyId: string, name: string) {
  const found = await prisma.department.findFirst({ where: { companyId, name } });
  return found ?? prisma.department.create({ data: { companyId, name } });
}

async function upsertPosition(companyId: string, name: string) {
  const found = await prisma.position.findFirst({ where: { companyId, name } });
  return found ?? prisma.position.create({ data: { companyId, name } });
}

async function upsertUser(
  companyId: string,
  data: {
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'MANAGER' | 'EMPLOYEE';
    passwordHash: string;
    departmentId?: string;
    positionId?: string;
    area?: string;
    unit?: string;
    managerId?: string;
  },
) {
  const found = await prisma.user.findFirst({ where: { companyId, email: data.email } });
  if (found) return found;
  return prisma.user.create({
    data: {
      companyId,
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: data.passwordHash,
      accessStatus: 'ACTIVE',
      departmentId: data.departmentId ?? null,
      positionId: data.positionId ?? null,
      area: data.area ?? null,
      unit: data.unit ?? null,
      managerId: data.managerId ?? null,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
