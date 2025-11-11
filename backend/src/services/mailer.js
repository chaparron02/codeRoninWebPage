import nodemailer from 'nodemailer';

const disabledReason = [];
let transporter = null;

function createTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!host || !port || !user || !pass) {
    disabledReason.push('SMTP credentials incomplete');
    return null;
  }

  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

export function getMailer() {
  if (transporter) return transporter;
  transporter = createTransport();
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const mailer = getMailer();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@coderonin.site';
  if (!mailer) {
    console.warn('[mailer] SMTP disabled', disabledReason.join(', ') || 'missing configuration');
    console.info(`[mailer] Fallback email to ${to}: ${subject}`);
    console.info(text || html || '');
    return { ok: false, disabled: true };
  }
  await mailer.sendMail({ from, to, subject, text, html });
  return { ok: true };
}
