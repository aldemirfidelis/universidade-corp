import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { EnrollmentStatus } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidityService } from '../validity/validity.service';

interface EnrollmentFilters {
  status?: string;
  courseId?: string;
  departmentId?: string;
  positionId?: string;
  area?: string;
  unit?: string;
  managerId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validity: ValidityService,
  ) {}

  /** Relatório de matrículas (treinamentos por funcionário) com filtros. */
  async enrollments(companyId: string, f: EnrollmentFilters) {
    const userFilter: Record<string, unknown> = {};
    if (f.departmentId) userFilter.departmentId = f.departmentId;
    if (f.positionId) userFilter.positionId = f.positionId;
    if (f.area) userFilter.area = f.area;
    if (f.unit) userFilter.unit = f.unit;
    if (f.managerId) userFilter.managerId = f.managerId;

    const enrolledAt: Record<string, Date> = {};
    if (f.from) enrolledAt.gte = new Date(f.from);
    if (f.to) enrolledAt.lte = new Date(`${f.to}T23:59:59`);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        companyId,
        status: (f.status as EnrollmentStatus) || undefined,
        courseId: f.courseId || undefined,
        user: Object.keys(userFilter).length ? userFilter : undefined,
        enrolledAt: Object.keys(enrolledAt).length ? enrolledAt : undefined,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            registration: true,
            area: true,
            unit: true,
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        course: { select: { title: true, code: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const progresses = await this.prisma.courseProgress.findMany({ where: { companyId } });
    const pByKey = new Map(progresses.map((p) => [`${p.userId}:${p.courseId}`, p]));

    // Validade (vencimento) por usuário.
    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    const validityByUser = new Map(
      await Promise.all(userIds.map(async (id) => [id, await this.validity.forUser(companyId, id)] as const)),
    );

    return enrollments.map((e) => {
      const v = validityByUser.get(e.userId)?.get(e.courseId);
      return {
        userId: e.userId,
        courseId: e.courseId,
        employee: e.user.name,
        email: e.user.email,
        registration: e.user.registration ?? '',
        position: e.user.position?.name ?? '—',
        department: e.user.department?.name ?? '—',
        area: e.user.area ?? '—',
        unit: e.user.unit ?? '—',
        course: e.course.title,
        courseCode: e.course.code ?? '',
        status: e.status,
        progress: pByKey.get(`${e.userId}:${e.courseId}`)?.percent ?? 0,
        completedAt: e.completedAt,
        validUntil: v?.validUntil ?? null,
        validity: v?.status ?? 'NONE',
        overdue:
          v?.status === 'EXPIRED' ||
          (e.status !== EnrollmentStatus.COMPLETED && e.dueDate ? e.dueDate < new Date() : false),
      };
    });
  }

  /** Exportação do relatório de matrículas em PDF. */
  async exportEnrollmentsPdf(companyId: string, f: EnrollmentFilters, res: Response) {
    const rows = await this.enrollments(companyId, f);
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-treinamentos.pdf"');
    doc.pipe(res);

    doc.fontSize(16).fillColor('#0f172a').text('Relatório de Treinamentos', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#64748b').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1);

    const headers = ['Funcionário', 'Cargo', 'Setor', 'Treinamento', 'Status', '%', 'Vencimento'];
    const widths = [130, 95, 90, 150, 70, 35, 70];
    let y = doc.y;
    const drawRow = (cols: string[], bold = false) => {
      let x = 30;
      doc.fontSize(8).fillColor(bold ? '#0f172a' : '#334155').font(bold ? 'Helvetica-Bold' : 'Helvetica');
      cols.forEach((c, i) => {
        doc.text(c, x, y, { width: widths[i], ellipsis: true });
        x += widths[i];
      });
      y += 16;
      if (y > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }
    };
    drawRow(headers, true);
    for (const r of rows) {
      drawRow([
        r.employee,
        r.position,
        r.department,
        r.course,
        r.overdue ? 'VENCIDO' : r.status,
        String(r.progress),
        r.validUntil ? new Date(r.validUntil).toLocaleDateString('pt-BR') : '—',
      ]);
    }
    doc.end();
  }

  /** Resumo por departamento (adesão/conclusão) para o gestor. */
  async byDepartment(companyId: string) {
    const departments = await this.prisma.department.findMany({
      where: { companyId, deletedAt: null },
    });
    const result: Array<{
      department: string;
      employees: number;
      enrollments: number;
      completed: number;
      completion: number;
    }> = [];
    for (const d of departments) {
      const userIds = (
        await this.prisma.user.findMany({
          where: { companyId, departmentId: d.id, deletedAt: null },
          select: { id: true },
        })
      ).map((u) => u.id);
      if (userIds.length === 0) {
        result.push({ department: d.name, employees: 0, enrollments: 0, completed: 0, completion: 0 });
        continue;
      }
      const [enrollments, completed] = await Promise.all([
        this.prisma.enrollment.count({ where: { companyId, userId: { in: userIds } } }),
        this.prisma.enrollment.count({
          where: { companyId, userId: { in: userIds }, status: EnrollmentStatus.COMPLETED },
        }),
      ]);
      result.push({
        department: d.name,
        employees: userIds.length,
        enrollments,
        completed,
        completion: enrollments > 0 ? Math.round((completed / enrollments) * 100) : 0,
      });
    }
    return result;
  }

  async exportEnrollmentsXlsx(companyId: string, f: EnrollmentFilters, res: Response) {
    const rows = await this.enrollments(companyId, f);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Treinamentos');
    ws.columns = [
      { header: 'Funcionário', key: 'employee', width: 30 },
      { header: 'Matrícula', key: 'registration', width: 14 },
      { header: 'Cargo', key: 'position', width: 22 },
      { header: 'Setor', key: 'department', width: 20 },
      { header: 'Área', key: 'area', width: 18 },
      { header: 'Unidade', key: 'unit', width: 16 },
      { header: 'Treinamento', key: 'course', width: 32 },
      { header: 'Código', key: 'courseCode', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Progresso (%)', key: 'progress', width: 14 },
      { header: 'Concluído em', key: 'completedAt', width: 16 },
      { header: 'Vencimento', key: 'validUntil', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) =>
      ws.addRow({
        ...r,
        status: r.overdue ? 'VENCIDO' : r.status,
        completedAt: r.completedAt ? new Date(r.completedAt).toLocaleDateString('pt-BR') : '',
        validUntil: r.validUntil ? new Date(r.validUntil).toLocaleDateString('pt-BR') : '',
      }),
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-treinamentos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }

  async exportCertificatesXlsx(companyId: string, res: Response) {
    const certs = await this.prisma.certificate.findMany({
      where: { companyId },
      include: { user: { select: { name: true } }, course: { select: { title: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Certificados');
    ws.columns = [
      { header: 'Funcionário', key: 'user', width: 30 },
      { header: 'Treinamento', key: 'course', width: 32 },
      { header: 'Código', key: 'code', width: 20 },
      { header: 'Carga horária', key: 'workload', width: 14 },
      { header: 'Emitido em', key: 'issued', width: 16 },
      { header: 'Válido até', key: 'valid', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    certs.forEach((c) =>
      ws.addRow({
        user: c.user.name,
        course: c.course.title,
        code: c.code,
        workload: c.workloadHours ?? '',
        issued: c.issuedAt.toLocaleDateString('pt-BR'),
        valid: c.validUntil ? c.validUntil.toLocaleDateString('pt-BR') : '',
        status: c.status,
      }),
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-certificados.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }

  async notifyManager(companyId: string, items: Array<{ userId: string; courseId: string }>) {
    let sentCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      const user = await this.prisma.user.findFirst({
        where: { id: item.userId, companyId, deletedAt: null },
        select: { name: true, managerId: true },
      });
      if (!user || !user.managerId) {
        skippedCount++;
        continue;
      }
      const course = await this.prisma.course.findFirst({
        where: { id: item.courseId, companyId, deletedAt: null },
        select: { title: true },
      });
      if (!course) {
        skippedCount++;
        continue;
      }

      await this.prisma.notification.create({
        data: {
          companyId,
          userId: user.managerId,
          type: 'GENERAL',
          title: 'Treinamento pendente de equipe',
          body: `O colaborador "${user.name}" está com o treinamento obrigatório "${course.title}" pendente. Por favor, auxilie e aplique o treinamento.`,
          linkUrl: `/gestor/dashboard`,
        },
      });
      sentCount++;
    }

    return { sent: sentCount, skipped: skippedCount };
  }
}
