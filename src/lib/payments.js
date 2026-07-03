import crypto from 'crypto';

// Payment / VietQR + SePay configuration (all from env, with sensible defaults).
const BASE = process.env.VIETQR_BASE_URL || 'https://vietqr.app/img';
const ACCOUNT = process.env.PAYMENT_ACCOUNT || '96247STUDYCHILL209';
const BANK = process.env.PAYMENT_BANK || 'BIDV';
const TEMPLATE = process.env.PAYMENT_QR_TEMPLATE || '';

export const PAYMENT_ACCOUNT = ACCOUNT;
export const PAYMENT_BANK = BANK;

// Payment window (QR countdown) in milliseconds.
export function getPaymentWindowMs() {
  const min = parseFloat(process.env.PAYMENT_WINDOW_MINUTES || '4');
  return Math.round((Number.isFinite(min) && min > 0 ? min : 4) * 60 * 1000);
}

function randomAlnum(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/**
 * Build a unique, bank-safe (alphanumeric-only) transfer memo tied to the order id.
 * Format: STUDYCHILL<last 6 of ObjectId><3 random> — e.g. STUDYCHILL9F3A2CK7Q
 * - Contains "STUDYCHILL" for identification
 * - Embeds part of the order id so admins can trace it
 * - 3 random chars for anti-collision (unique index on desCode is the hard guarantee)
 */
export function buildDesCode(objectId) {
  const idPart = String(objectId).slice(-6).toUpperCase();
  return `STUDYCHILL${idPart}${randomAlnum(3)}`;
}

// Normalize a memo for matching: keep only A-Z0-9, uppercase.
// Banks often strip spaces/special chars from transfer content.
export function normalizeDes(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Extract a STUDYCHILL... token from a raw bank transfer content string.
export function extractDesCode(content) {
  const m = String(content || '').match(/STUDYCHILL[A-Z0-9]+/i);
  return m ? m[0].toUpperCase() : '';
}

/**
 * Build the VietQR image URL that encodes the transfer (amount + memo pre-filled).
 * e.g. https://vietqr.app/img?acc=96247STUDYCHILL209&bank=BIDV&amount=199000&des=STUDYCHILL...
 */
export function buildQrUrl(amount, desCode) {
  const params = new URLSearchParams({
    acc: ACCOUNT,
    bank: BANK,
    amount: String(amount),
    des: desCode,
  });
  if (TEMPLATE) params.set('template', TEMPLATE);
  return `${BASE}?${params.toString()}`;
}
