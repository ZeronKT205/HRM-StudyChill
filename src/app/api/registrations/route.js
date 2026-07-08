import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { getComboById } from '@/lib/combos';
import { buildDesCode, buildQrUrl, getPaymentWindowMs } from '@/lib/payments';
import { sendRegistrationReceivedEmail, sendTrialReceivedEmail, sendTrialAlreadyEmail } from '@/lib/email';

// POST /api/registrations - Public: a student registers for a combo (or a free trial)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { fullName, phone, email, comboId, note } = body;
    const isTrial = body.type === 'trial';

    // ===== Common validation =====
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
    // Email is required (used to send confirmation emails / verify the address).
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập email.' }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ===== Free trial branch (no payment) =====
    if (isTrial) {
      // Prevent repeat trials: block if this phone OR email already used a trial.
      const phoneTrim = phone.trim();
      const existingTrial = await Registration.findOne({
        type: 'trial',
        $or: [{ email: cleanEmail }, { phone: phoneTrim }],
      }).select('_id').lean();

      if (existingTrial) {
        // Nudge them to buy + email the "view full course" link.
        try {
          await sendTrialAlreadyEmail(cleanEmail);
        } catch (mailErr) {
          console.error('sendTrialAlreadyEmail failed:', mailErr?.message);
        }
        return NextResponse.json(
          {
            error: 'ALREADY_TRIAL',
            alreadyTrial: true,
            message:
              'Bạn đã đăng ký học thử trước đó rồi. Hãy đăng ký khóa học để trải nghiệm trọn vẹn đến hết kỳ thi THPT Quốc Gia! Chúng tôi vừa gửi email kèm link xem toàn bộ khóa học cho bạn.',
          },
          { status: 409 }
        );
      }

      const _id = new mongoose.Types.ObjectId();

      // Send the "received" email first — gate creation on a successful send.
      try {
        await sendTrialReceivedEmail(cleanEmail);
      } catch (mailErr) {
        console.error('sendTrialReceivedEmail failed:', mailErr?.message);
        return NextResponse.json(
          { error: 'Không gửi được email xác nhận. Vui lòng kiểm tra lại địa chỉ email.' },
          { status: 502 }
        );
      }

      const trial = await Registration.create({
        _id,
        type: 'trial',
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        comboId: 'trial',
        comboName: 'Đăng ký học thử',
        comboPrice: 0,
        note: (note || '').trim(),
        amount: 0,
        // Give trials a unique, non-payment desCode so the unique index is satisfied.
        desCode: `TRIAL${String(_id).toUpperCase()}`,
        qrUrl: '',
        paymentStatus: 'pending',
        expiresAt: null,
        receivedEmailSent: true,
        status: 'new',
      });

      return NextResponse.json(
        { message: 'Đăng ký học thử thành công', registration: { id: trial._id.toString(), type: 'trial' } },
        { status: 201 }
      );
    }

    // ===== Combo branch (paid) =====
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
    const type = searchParams.get('type'); // 'combo' | 'trial'
    const bucket = searchParams.get('bucket'); // workflow-oriented filter
    const skip = (page - 1) * limit;

    const query = {};

    // Registration type: the course-registration tab passes 'combo', the trial tab 'trial'.
    if (type === 'combo') query.type = { $ne: 'trial' };
    else if (type === 'trial') query.type = 'trial';

    // High-level workflow buckets used by the admin page filters.
    if (bucket === 'needs_processing') {
      query.processed = false;
      if (type !== 'trial') query.paymentStatus = 'paid'; // combos must be paid first
    } else if (bucket === 'approved') {
      query.processed = true;
    } else if (bucket === 'pending') {
      query.paymentStatus = 'pending';
    }

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
