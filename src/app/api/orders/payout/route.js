import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { ctvEmail } = body;

    if (!ctvEmail) {
      return NextResponse.json({ error: 'ctvEmail required' }, { status: 400 });
    }

    const result = await Order.updateMany(
      { ctvEmail: ctvEmail.toLowerCase(), status: 'approved' },
      { $set: { status: 'paid' } }
    );

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật ${result.modifiedCount} đơn hàng sang trạng thái đã trả hoa hồng.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('POST /api/orders/payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
