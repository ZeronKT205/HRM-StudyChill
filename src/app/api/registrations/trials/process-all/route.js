import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import { sendTrialApprovedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/registrations/trials/process-all  (admin only)
// Marks ALL pending trial registrations as processed (đã duyệt) and emails each
// student that their trial is activated. Used after admin adds the exported
// emails to the Google Group.
export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const trials = await Registration.find({ type: 'trial', processed: false })
      .select('_id email')
      .lean();

    if (trials.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Không có đơn học thử nào cần xử lý.' });
    }

    const ids = trials.map((t) => t._id);
    const now = new Date();
    const adminEmail = session.user.email.toLowerCase();

    // Notify each student (best-effort — one failure shouldn't block the rest).
    await Promise.allSettled(
      trials.map((t) => sendTrialApprovedEmail(t.email, []))
    );

    await Registration.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          processed: true,
          processedAt: now,
          approvedBy: adminEmail,
          status: 'done',
          confirmEmailSent: true,
        },
      }
    );

    return NextResponse.json({
      processed: ids.length,
      message: `Đã duyệt ${ids.length} đơn học thử.`,
    });
  } catch (error) {
    console.error('POST /api/registrations/trials/process-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
