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
    // Breakdown so the sidebar can badge combos and trials separately.
    const [combo, trial] = await Promise.all([
      Registration.countDocuments({ type: { $ne: 'trial' }, paymentStatus: 'paid', processed: false }),
      Registration.countDocuments({ type: 'trial', processed: false }),
    ]);

    return NextResponse.json({ count: combo + trial, combo, trial });
  } catch (error) {
    console.error('GET /api/registrations/pending-count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
