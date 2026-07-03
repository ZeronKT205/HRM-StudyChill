import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';

export const dynamic = 'force-dynamic';

// GET /api/registrations/pending-count  (admin only)
// Count of registrations that are paid but not yet processed (đơn cần xử lý).
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const count = await Registration.countDocuments({ paymentStatus: 'paid', processed: false });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('GET /api/registrations/pending-count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
