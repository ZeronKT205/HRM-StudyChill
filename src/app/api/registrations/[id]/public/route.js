import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';

export const dynamic = 'force-dynamic';

// GET /api/registrations/[id]/public
// Public payment info for the QR page + polling fallback. Returns ONLY
// non-sensitive fields (no phone/email/full name).
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await connectDB();
    const reg = await Registration.findById(id)
      .select('comboName amount desCode qrUrl paymentStatus expiresAt paidAt')
      .lean();

    if (!reg) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: String(reg._id),
      comboName: reg.comboName,
      amount: reg.amount,
      desCode: reg.desCode,
      qrUrl: reg.qrUrl,
      paymentStatus: reg.paymentStatus,
      expiresAt: reg.expiresAt,
      paidAt: reg.paidAt,
    });
  } catch (error) {
    console.error('GET /api/registrations/[id]/public error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
