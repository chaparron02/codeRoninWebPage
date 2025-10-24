import { sendMail } from '../services/mailer.js';

const DEFAULT_JUTSU = 'gAt1t0.';
const ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'coderonin404@gmail.com';

export async function verifyJutsu(jutsu, { context = 'operacion', actor = 'desconocido', sendAlert = true } = {}) {
  const expected = process.env.ADMIN_JUTSU || DEFAULT_JUTSU;
  if (String(jutsu || '') === expected) return true;
  if (sendAlert) {
    try {
      await sendMail({
        to: ALERT_EMAIL,
        subject: 'Intento fallido del jutsu sagrado',
        text: `Se recibio un jutsu invalido para ${context}. Actor: ${actor}. Fecha: ${new Date().toISOString()}`,
      });
    } catch (err) {
      console.error('[jutsu] No se pudo enviar alerta', err);
    }
  }
  return false;
}
