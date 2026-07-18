import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { sendPaymentReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Serverless (Vercel) function budget — emails are sent sequentially, so keep the
// batch small enough to finish within this window.
export const maxDuration = 60;

// Touch thresholds (ms from dripBaseAt). Overridable via env (minutes).
const MIN = 60 * 1000;
const T1 = (parseFloat(process.env.DRIP_TOUCH1_MIN) || 90) * MIN;      // ~1–2h
const T2 = (parseFloat(process.env.DRIP_TOUCH2_MIN) || 24 * 60) * MIN; // 24h
const T3 = (parseFloat(process.env.DRIP_TOUCH3_MIN) || 72 * 60) * MIN; // 72h
const THRESHOLDS = { 1: T1, 2: T2, 3: T3 };
// Keep small: emails are sent sequentially and must fit within maxDuration on
// serverless. Frequent cron runs drain the queue.
const BATCH = parseInt(process.env.DRIP_BATCH || '40', 10);

// Auth secret: reuse NEXTAUTH_SECRET (already set on Vercel) so no extra env is
// needed. A dedicated CRON_SECRET still takes precedence if you set one.
function cronSecret() {
  return process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || '';
}

function authorized(request) {
  const secret = cronSecret();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const url = new URL(request.url);
  const qs = url.searchParams.get('secret');
  return bearer === secret || qs === secret;
}

async function runDrip(request) {
  if (!cronSecret()) {
    return NextResponse.json(
      { error: 'Chưa cấu hình NEXTAUTH_SECRET/CRON_SECRET trên server.' },
      { status: 503 }
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const now = Date.now();

  // Pending combos still in the campaign: not trial, not paid, NOT already
  // processed/granted, not unsubscribed, and haven't received all 3 touches.
  const candidates = await Registration.find({
    type: { $ne: 'trial' },
    paymentStatus: 'pending',
    processed: { $ne: true },
    unsubscribed: { $ne: true },
    dripTouch: { $lt: 3 },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH)
    .exec();

  let seeded = 0;      // old/new rows that just got their clock started
  let sent = 0;
  const byTouch = { 1: 0, 2: 0, 3: 0 };
  const errors = [];

  for (const reg of candidates) {
    // Handle legacy rows (or any missing baseline): start the clock from NOW so
    // old data is processed from the first trigger run, not retroactively blasted.
    if (!reg.dripBaseAt) {
      reg.dripBaseAt = new Date(now);
      await reg.save();
      seeded += 1;
      continue;
    }

    const elapsed = now - new Date(reg.dripBaseAt).getTime();
    const nextTouch = reg.dripTouch + 1; // 1..3
    const threshold = THRESHOLDS[nextTouch];
    if (threshold == null || elapsed < threshold) continue;

    try {
      await sendPaymentReminderEmail(
        { id: String(reg._id), email: reg.email, comboName: reg.comboName, amount: reg.amount, desCode: reg.desCode },
        nextTouch
      );
      reg.dripTouch = nextTouch;
      reg.dripLastSentAt = new Date(now);
      await reg.save();
      sent += 1;
      byTouch[nextTouch] += 1;
    } catch (err) {
      errors.push({ id: String(reg._id), error: err?.message });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    seeded,
    sent,
    byTouch,
    errors: errors.slice(0, 20),
  });
}

// Support both POST (crontab curl -X POST) and GET (simple curl / uptime pings).
export async function POST(request) {
  return runDrip(request);
}
export async function GET(request) {
  return runDrip(request);
}
