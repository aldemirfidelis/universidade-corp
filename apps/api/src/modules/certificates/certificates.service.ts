import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { CertificateStatus } from '@uc/shared';
import { PrismaService } from '../../prisma/prisma.service';

function frontendUrl(): string {
  return (process.env.WEB_ORIGIN ?? process.env.API_CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')[0]
    .trim();
}

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de certificados da empresa (admin). */
  list(companyId: string) {
    return this.prisma.certificate.findMany({
      where: { companyId },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Validação pública por código (sem autenticação). */
  async validate(code: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { code },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
    if (!cert) return { valid: false };
    const company = await this.prisma.company.findUnique({
      where: { id: cert.companyId },
      select: { tradeName: true },
    });
    const expired = cert.validUntil ? cert.validUntil < new Date() : false;
    return {
      valid: cert.status === CertificateStatus.VALID && !expired,
      code: cert.code,
      userName: cert.user.name,
      courseName: cert.course.title,
      companyName: company?.tradeName ?? '',
      issuedAt: cert.issuedAt,
      validUntil: cert.validUntil,
      workloadHours: cert.workloadHours,
      status: expired ? 'EXPIRED' : cert.status,
    };
  }

  /** Gera e envia o PDF do certificado. Verifica posse (aluno) ou empresa (admin). */
  async streamPdf(companyId: string, certId: string, requesterId: string, isAdmin: boolean, res: Response) {
    const cert = await this.prisma.certificate.findFirst({
      where: { id: certId, companyId },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { title: true } },
      },
    });
    if (!cert) throw new NotFoundException('Certificado não encontrado');
    if (!isAdmin && cert.user.id !== requesterId) throw new NotFoundException('Certificado não encontrado');

    const [settings, company] = await Promise.all([
      this.prisma.companySettings.findUnique({ where: { companyId } }),
      this.prisma.company.findUnique({ where: { id: companyId }, select: { tradeName: true } }),
    ]);
    const universityName = settings?.universityName ?? company?.tradeName ?? 'Universidade Corporativa';
    const brand = settings?.primaryColor ?? '#2563eb';

    const validateUrl = `${frontendUrl()}/validar/${cert.code}`;
    const qrDataUrl = await QRCode.toDataURL(validateUrl, { margin: 1, width: 200 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificado-${cert.code}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    // Moldura
    doc.lineWidth(3).strokeColor(brand).rect(25, 25, W - 50, doc.page.height - 50).stroke();

    doc.fillColor(brand).fontSize(14).text(universityName.toUpperCase(), { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#0f172a').fontSize(34).text('CERTIFICADO', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(14).text('Certificamos que', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#0f172a').fontSize(26).text(cert.user.name, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fillColor('#334155')
      .fontSize(14)
      .text(
        `concluiu com aproveitamento o treinamento "${cert.course.title}"` +
          (cert.workloadHours ? `, com carga horária de ${cert.workloadHours} hora(s).` : '.'),
        { align: 'center' },
      );

    doc.moveDown(2);
    const issued = cert.issuedAt.toLocaleDateString('pt-BR');
    doc.fontSize(12).fillColor('#64748b').text(`Emitido em ${issued}`, { align: 'center' });
    if (cert.validUntil) {
      doc.text(`Válido até ${cert.validUntil.toLocaleDateString('pt-BR')}`, { align: 'center' });
    }

    // QR + código no rodapé
    const qrSize = 90;
    doc.image(qrBuffer, W - 50 - qrSize, doc.page.height - 50 - qrSize - 10, { width: qrSize });
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text(`Código de validação: ${cert.code}`, 50, doc.page.height - 70, { align: 'left' });

    doc.end();
  }
}
