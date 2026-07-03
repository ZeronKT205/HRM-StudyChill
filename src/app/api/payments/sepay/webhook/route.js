import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { extractDesCode, normalizeDes } from '@/lib/payments';
import { emitPaid } from '@/lib/realtime';
import { sendRegistrationConfirmedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/payments/sepay/webhook
 *
 * SePay calls this when a transfer lands on the receiving account. Payloads vary:
 *   { transaction_content, amount_in }         (bank transaction log format)
 *   { content, transferAmount }                (SePay generic webhook format)
 *
 * Flow: extract the STUDYCHILL... memo + amount -> find the pending registration
 * -> verify amount -> mark paid -> push realtime event -> send confirmation email.
 * Idempotent: re-delivering the same payment returns success without side effects.
 */
export async function POST(request) {
  try {
    // Optional API key check (SePay sends: Authorization: Apikey <key>)
    const requiredKey = process.env.SEPAY_WEBHOOK_API_KEY;
    if (requiredKey) {
      const auth = request.headers.get('authorization') || '';
      const provided = auth.replace(/^Apikey\s+/i, '').trim();
      if (provided !== requiredKey) {
        console.error('[SEPAY WEBHOOK] Unauthorized: bad API key');
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    const content = payload.transaction_content || payload.content || '';
    const rawAmount = payload.amount_in ?? payload.transferAmount ?? payload.amount ?? 0;

    if (!content) {
      return NextResponse.json({ success: false, message: 'Missing transaction content' }, { status: 400 });
    }

    // Normalize amount to an integer VNĐ (handles "199000.00" strings).
    let amount;
    try {
      amount = typeof rawAmount === 'number' ? Math.trunc(rawAmount) : Math.trunc(parseFloat(String(rawAmount)));
    } catch {
      amount = NaN;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    await connectDB();

    // ===== Match the registration by transfer memo =====
    const candidate = extractDesCode(content); // e.g. STUDYCHILL9F3A2CK7Q
    let reg = null;

    if (candidate) {
      reg = await Registration.findOne({ desCode: candidate });
    }

    // Fallback: banks may append/alter chars — compare normalized memos.
    if (!reg) {
      const normContent = normalizeDes(content);
      const recent = await Registration.find({ paymentStatus: { $ne: 'paid' } })
        .sort({ createdAt: -1 })
        .limit(200)
        .select('desCode amount comboName email paymentStatus confirmEmailSent')
        .exec();
      reg = recent.find((r) => normContent.includes(normalizeDes(r.desCode))) || null;
    }

    if (!reg) {
      console.error('[SEPAY WEBHOOK] Order not found for content:', content);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Idempotency: already processed.
    if (reg.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, message: 'Already processed', id: String(reg._id) });
    }

    // Verify amount matches the combo price.
    if (Number(reg.amount) !== amount) {
      console.error(`[SEPAY WEBHOOK] Amount mismatch. Expected ${reg.amount}, got ${amount}`);
      return NextResponse.json({ success: false, message: 'Amount mismatch' }, { status: 400 });
    }

    // Mark paid + audit trail.
    reg.paymentStatus = 'paid';
    reg.paidAt = new Date();
    reg.sepayTxId = String(payload.id || payload.referenceCode || payload.reference_number || '');
    reg.sepayRef = String(payload.reference_number || payload.referenceCode || '');
    reg.sepayRaw = payload;
    await reg.save();

    console.log(`[SEPAY WEBHOOK] ✓ Payment confirmed for ${reg._id} (${reg.desCode}), amount ${amount}`);

    // Push realtime event to the QR page (same-process listeners).
    emitPaid(String(reg._id), { amount });

    // Send the "confirmed" email (best-effort, once).
    if (!reg.confirmEmailSent) {
      try {
        await sendRegistrationConfirmedEmail(reg.email, reg.comboName);
        reg.confirmEmailSent = true;
        await reg.save();
      } catch (mailErr) {
        console.error('[SEPAY WEBHOOK] confirmation email failed:', mailErr?.message);
      }
    }

    return NextResponse.json({ success: true, message: 'Payment processed', id: String(reg._id) });
  } catch (error) {
    console.error('[SEPAY WEBHOOK] error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
