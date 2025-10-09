import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    // Read primary vars (SMTP_*) and fallbacks (EMAIL_* from some providers)
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const portStr = process.env.SMTP_PORT || process.env.EMAIL_PORT;
    const user = process.env.SMTP_USER || process.env.EMAIL_HOST_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_HOST_PASSWORD;
    const useTlsStr = process.env.EMAIL_USE_TLS; // 'True'|'False' optional

    const port = portStr ? parseInt(portStr, 10) : undefined;
    const secure = port === 465; // SSL
    const requireTLS = !secure && (useTlsStr?.toLowerCase() === 'true' || port === 587);

    if (!host || !port || !user || !pass) {
      logger.warn('SMTP not fully configured. Emails will be logged instead of sent.', {
        hostPresent: !!host,
        portPresent: !!port,
        userPresent: !!user,
        passPresent: !!pass,
      });
      return null;
    }

    logger.info('Configuring SMTP transporter', {
      host,
      port,
      secure,
      requireTLS,
      user: user.replace(/.(?=.{2})/g, '*'),
    });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: requireTLS ? { rejectUnauthorized: false } : undefined,
    });

    return this.transporter;
  }

  static async sendEmail(params: SendEmailParams): Promise<void> {
    const from = process.env.EMAIL_FROM || 'no-reply@eunacom.local';
    const transporter = this.getTransporter();

    if (!transporter) {
      logger.info('Email (logged only):', { from, ...params });
      return;
    }

    try {
      // Optional connection verification for clearer errors
      try {
        await transporter.verify();
        logger.info('SMTP verified successfully');
      } catch (verifyError) {
        logger.warn('SMTP verify failed (continuing to send):', verifyError);
      }

      await transporter.sendMail({ from, to: params.to, subject: params.subject, html: params.html });
      logger.info('Email sent successfully', { to: params.to, subject: params.subject, from });
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }
}

export function buildVerificationEmail(recipientEmail: string, verificationUrl: string): { subject: string; html: string } {
  const subject = 'Confirma tu correo | EUNACOM';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Confirma tu correo</h2>
      <p>Gracias por registrarte en EUNACOM. Por favor confirma tu correo para activar tu cuenta.</p>
      <p>
        <a href="${verificationUrl}"
           style="display:inline-block; padding:12px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
          Confirmar mi correo
        </a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>Este enlace expira en ${process.env.EMAIL_TOKEN_TTL_HOURS || '24'} horas.</p>
    </div>
  `;
  return { subject, html };
}


