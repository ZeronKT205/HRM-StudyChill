import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { sendOrderReceivedEmail } from '@/lib/email';

// Vietnam timezone offset — date filters are entered by admins in local (vi-VN) days
const VN_OFFSET = '+07:00';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'value-desc': { orderValue: -1, createdAt: -1 },
  'value-asc': { orderValue: 1, createdAt: -1 },
};

// GET /api/orders - List orders (supports search / flag / date-range / sort)
export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const ctvEmail = searchParams.get('ctvEmail');
    const search = (searchParams.get('search') || '').trim();
    const flag = searchParams.get('flag') || 'all';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sort = searchParams.get('sort') || 'newest';

    // Base query — every filter except status (so we can still count each status tab)
    const baseQuery = {};

    // Non-admin can only see their own orders
    if (!isAdmin(session)) {
      baseQuery.ctvEmail = session.user.email;
    } else if (ctvEmail) {
      baseQuery.ctvEmail = ctvEmail.toLowerCase().trim();
    }

    // Free-text search across CTV / customer / course / note, plus exact order id
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const or = [
        { ctvName: rx },
        { ctvEmail: rx },
        { customerEmail: rx },
        { courseDescription: rx },
        { adminNote: rx },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      baseQuery.$or = or;
    }

    // Flag filter: đơn thường / đã trừ hoa hồng / báo lỗi
    if (flag === 'error') {
      baseQuery.isError = true;
    } else if (flag === 'deducted') {
      baseQuery.commissionDeducted = true;
    } else if (flag === 'normal') {
      baseQuery.isError = { $ne: true };
      baseQuery.commissionDeducted = { $ne: true };
    }

    // Date range on createdAt (inclusive, Vietnam local days)
    if (from || to) {
      baseQuery.createdAt = {};
      if (from) baseQuery.createdAt.$gte = new Date(`${from}T00:00:00.000${VN_OFFSET}`);
      if (to) baseQuery.createdAt.$lte = new Date(`${to}T23:59:59.999${VN_OFFSET}`);
    }

    const query = { ...baseQuery };
    if (status && status !== 'all') {
      query.status = status;
    }

    const sortSpec = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

    const [orders, total, statusAgg] = await Promise.all([
      Order.find(query)
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
      Order.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0, paid: 0 };
    for (const row of statusAgg) {
      if (row._id in counts) counts[row._id] = row.count;
      counts.all += row.count;
    }

    return NextResponse.json({
      orders,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders - Create new order
export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { ctvName, customerEmail, courseDescription, orderValue, billImage, selectedFolders, commissionDeducted, isError } = body;

    // Validation (error orders are forced to 0đ, so no order value required)
    if (!ctvName || !customerEmail || !courseDescription || (!orderValue && !isError)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Bill/biên lai is mandatory for every order — no exceptions
    if (!billImage || !String(billImage).trim()) {
      return NextResponse.json(
        { error: 'Vui lòng tải lên ảnh bill / biên lai chuyển khoản' },
        { status: 400 }
      );
    }

    // Create order
    const order = await Order.create({
      ctvName,
      ctvEmail: session.user.email,
      customerEmail,
      courseDescription,
      orderValue: isError ? 0 : Number(orderValue),
      commissionDeducted: !!commissionDeducted,
      isError: !!isError,
      billImage: String(billImage).trim(),
      selectedFolders: selectedFolders || [],
      driveShareStatus: (selectedFolders || []).map(f => ({
        folderId: f.folderId,
        folderName: f.folderName,
        status: 'pending',
      })),
      status: 'pending',
    });

    // Notify the customer that we received the order (also verifies the email address).
    // Best-effort: don't block order creation if the email fails.
    try {
      await sendOrderReceivedEmail(order.customerEmail, order.courseDescription);
    } catch (mailErr) {
      console.error('sendOrderReceivedEmail failed:', mailErr?.message);
    }

    return NextResponse.json({ order, message: 'Order created successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
