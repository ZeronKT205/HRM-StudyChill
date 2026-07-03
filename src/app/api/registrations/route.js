import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { getComboById } from '@/lib/combos';
import { buildDesCode, buildQrUrl, getPaymentWindowMs } from '@/lib/payments';
import { sendRegistrationReceivedEmail } from '@/lib/email';

// POST /api/registrations - Public: a student registers for a combo
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { fullName, phone, email, comboId, note } = body;

    // ===== Validation =====
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập họ tên.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập số điện thoại.' }, { status: 400 });
    }
    const digits = String(phone).replace(/[^\d]/g, '');
    if (digits.length < 9 || digits.length > 12) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 });
    }
    // Email is now required (used to send confirmation emails).
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập email.' }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
    }

    // Resolve combo from the server-side catalog so price/name can't be spoofed.
    const combo = getComboById(comboId);
    if (!combo) {
      return NextResponse.json({ error: 'Gói không hợp lệ.' }, { status: 400 });
    }

    // Note is required for combos where the student must specify subjects/teachers.
    if (combo.requiresNote && (!note || !note.trim())) {
      return NextResponse.json(
        { error: `Vui lòng nhập ${(combo.noteLabel || 'ghi chú').toLowerCase()} cho gói này.` },
        { status: 400 }
      );
    }

    // Pre-generate the id so the transfer memo (desCode) can embed part of it.
    const _id = new mongoose.Types.ObjectId();
    const amount = combo.price;
    const expiresAt = new Date(Date.now() + getPaymentWindowMs());
    const cleanEmail = email.trim().toLowerCase();

    // Send the "received" email FIRST — only proceed to the QR page if it sends,
    // which also serves as a basic check that the email address is deliverable.
    try {
      await sendRegistrationReceivedEmail(cleanEmail, combo.name);
    } catch (mailErr) {
      console.error('sendRegistrationReceivedEmail failed:', mailErr?.message);
      return NextResponse.json(
        { error: 'Không gửi được email xác nhận. Vui lòng kiểm tra lại địa chỉ email.' },
        { status: 502 }
      );
    }

    // Create the registration, retrying if the random desCode collides.
    let registration = null;
    for (let attempt = 0; attempt < 4 && !registration; attempt++) {
      const desCode = buildDesCode(_id);
      try {
        registration = await Registration.create({
          _id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          comboId: combo.id,
          comboName: combo.name,
          comboPrice: combo.price,
          note: (note || '').trim(),
          amount,
          desCode,
          qrUrl: buildQrUrl(amount, desCode),
          paymentStatus: 'pending',
          expiresAt,
          receivedEmailSent: true,
          status: 'new',
        });
      } catch (err) {
        if (err?.code === 11000) continue; // duplicate desCode — regenerate
        throw err;
      }
    }

    if (!registration) {
      return NextResponse.json({ error: 'Không tạo được mã thanh toán, vui lòng thử lại.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Đăng ký thành công',
        registration: {
          id: registration._id.toString(),
          comboName: registration.comboName,
          amount: registration.amount,
          desCode: registration.desCode,
          qrUrl: registration.qrUrl,
          expiresAt: registration.expiresAt,
          paymentStatus: registration.paymentStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/registrations - Admin only: list registrations
export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;

    const [registrations, total] = await Promise.all([
      Registration.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments(query),
    ]);

    return NextResponse.json({
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
