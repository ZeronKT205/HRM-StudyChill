import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';
import Order from '@/lib/models/Order';
import { shareMultipleFolders } from '@/lib/drive';
import { sendApprovalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/registrations/[id]/approve  (admin only)
// Grants Drive access to the student's email, then creates an Order attributed to
// the acting admin account with status 'paid' (đã trả hoa hồng), and marks the
// registration as processed (đã duyệt).
export async function POST(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const selectedFolders = Array.isArray(body.selectedFolders) ? body.selectedFolders : [];

    if (selectedFolders.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một khóa học để cấp quyền.' },
        { status: 400 }
      );
    }

    const registration = await Registration.findById(id);
    if (!registration) {
      return NextResponse.json({ error: 'Không tìm thấy đăng ký' }, { status: 404 });
    }
    if (registration.processed) {
      return NextResponse.json({ error: 'Đơn này đã được duyệt trước đó.' }, { status: 400 });
    }

    const courseDescription = registration.note
      ? `${registration.comboName} — ${registration.note}`
      : registration.comboName;

    // Share the selected Drive folders with the student + send the activation email
    // (run in parallel, mirroring the order-approval flow).
    const folderIds = selectedFolders.map((f) => f.folderId).filter(Boolean);
    const [shareResults] = await Promise.all([
      shareMultipleFolders(folderIds, registration.email),
      sendApprovalEmail(registration.email, courseDescription, selectedFolders).catch((emailError) => {
        console.error('Failed to send activation email:', emailError?.message);
      }),
    ]);

    const driveShareStatus = shareResults.map((r) => ({
      folderId: r.folderId,
      folderName: selectedFolders.find((sf) => sf.folderId === r.folderId)?.folderName || '',
      status: r.success ? 'success' : 'failed',
      error: r.error || '',
    }));

    // Create the Order attributed to the admin account, already commission-paid.
    const order = await Order.create({
      ctvName: session.user.name || 'Admin',
      ctvEmail: session.user.email.toLowerCase(),
      customerEmail: registration.email,
      courseDescription,
      orderValue: registration.amount,
      selectedFolders,
      driveShareStatus,
      status: 'paid',
      commissionDeducted: true,
      adminNote: `Duyệt từ đăng ký combo (${registration.desCode})`,
    });

    // Mark the registration as processed / approved.
    registration.processed = true;
    registration.processedAt = new Date();
    registration.approvedBy = session.user.email.toLowerCase();
    registration.orderId = order._id;
    registration.selectedFolders = selectedFolders;
    registration.driveShareStatus = driveShareStatus;
    registration.status = 'done';
    await registration.save();

    return NextResponse.json({
      message: 'Đã duyệt và cấp quyền khóa học',
      orderId: order._id.toString(),
      driveShareStatus,
    });
  } catch (error) {
    console.error('POST /api/registrations/[id]/approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
