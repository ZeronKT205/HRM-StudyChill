import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// GET /api/orders - List orders
export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const ctvEmail = searchParams.get('ctvEmail');

    // Build query
    const query = {};
    
    // Non-admin can only see their own orders
    if (!isAdmin(session)) {
      query.ctvEmail = session.user.email;
    } else if (ctvEmail) {
      query.ctvEmail = ctvEmail.toLowerCase().trim();
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      orders,
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
    const { ctvName, customerEmail, courseDescription, orderValue, billImage, selectedFolders } = body;

    // Validation
    if (!ctvName || !customerEmail || !courseDescription || !orderValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order
    const order = await Order.create({
      ctvName,
      ctvEmail: session.user.email,
      customerEmail,
      courseDescription,
      orderValue: Number(orderValue),
      billImage: billImage || '',
      selectedFolders: selectedFolders || [],
      driveShareStatus: (selectedFolders || []).map(f => ({
        folderId: f.folderId,
        folderName: f.folderName,
        status: 'pending',
      })),
      status: 'pending',
    });

    return NextResponse.json({ order, message: 'Order created successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
