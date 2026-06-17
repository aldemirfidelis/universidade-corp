import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../common/env';

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!env.smtp.host) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      });
    }
    return this.transporter;
  }

  /**
   * Envia e-mail. Em dev (sem SMTP configurado), apenas loga — o link de convite/
   * reset também é devolvido pela API para facilitar o teste local.
   */
  async send(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.log(`[DEV] E-mail para ${to} — ${subject}\n${html}`);
      return;
    }
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
  }
}
