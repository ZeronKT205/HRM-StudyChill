import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// GET /api/users - List all CTVs (admin) or get self profile (CTV/Admin)
export async function GET(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // Return self profile if mode is 'me' or user is not admin
    if (!isAdmin(session) || mode === 'me') {
      const user = await User.findOne({ email: session.user.email }).lean();
      return NextResponse.json({ user });
    }

    // Admin lists all users
    const users = await User.find().sort({ createdAt: -1 }).lean();

    // Also fetch approved order counts per CTV for payout badges
    const Order = (await import('@/lib/models/Order')).default;
    const approvedAgg = await Order.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$ctvEmail', count: { $sum: 1 } } },
    ]);
    const approvedCounts = {};
    approvedAgg.forEach(a => { approvedCounts[a._id] = a.count; });

    return NextResponse.json({ users, approvedCounts });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users - Update user (admin only)
export async function PUT(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { userId, ...updates } = body;

    // Case 1: Update self profile (no userId provided)
    if (!userId) {
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Allow name, phone and payment details updates
      if (updates.name) user.name = updates.name;
      if (updates.phone !== undefined) user.phone = updates.phone;
      if (updates.bankName !== undefined) user.bankName = updates.bankName;
      if (updates.bankAccountNumber !== undefined) user.bankAccountNumber = updates.bankAccountNumber;
      if (updates.bankAccountName !== undefined) user.bankAccountName = updates.bankAccountName;
      if (updates.qrCodeImage !== undefined) user.qrCodeImage = updates.qrCodeImage;
      
      await user.save();
      
      return NextResponse.json({ user, message: 'Profile updated' });
    }

    // Case 2: Admin updates another user (userId provided)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user, message: 'User updated' });
  } catch (error) {
    console.error('PUT /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
