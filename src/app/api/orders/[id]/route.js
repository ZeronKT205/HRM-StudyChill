import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { shareMultipleFolders } from '@/lib/drive';
import { sendApprovalEmail } from '@/lib/email';

// GET /api/orders/[id]
export async function GET(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Non-admin can only view their own orders
    if (!isAdmin(session) && order.ctvEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order (admin: approve/reject, ctv: edit pending orders)
export async function PUT(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const oldStatus = order.status;

    if (isAdmin(session)) {
      // Admin can update status and add notes
      if (body.status) order.status = body.status;
      if (body.adminNote !== undefined) order.adminNote = body.adminNote;
      
      // Handle automatic folder sharing and customer email notification upon approval
      if (body.status === 'approved' && oldStatus !== 'approved') {
        const folderIds = (order.selectedFolders || []).map(f => f.folderId);
        
        if (folderIds.length > 0) {
          // Run folder sharing and email sending in parallel to minimize response latency
          const [shareResults] = await Promise.all([
            shareMultipleFolders(folderIds, order.customerEmail),
            sendApprovalEmail(order.customerEmail, order.courseDescription, order.selectedFolders || []).catch(emailError => {
              console.error('Failed to send activation email:', emailError.message);
            })
          ]);
          
          order.driveShareStatus = shareResults.map(r => ({
            folderId: r.folderId,
            folderName: (order.selectedFolders.find(sf => sf.folderId === r.folderId)?.folderName) || '',
            status: r.success ? 'success' : 'failed',
            error: r.error || '',
          }));
        } else {
          try {
            await sendApprovalEmail(order.customerEmail, order.courseDescription, order.selectedFolders || []);
          } catch (emailError) {
            console.error('Failed to send activation email:', emailError.message);
          }
        }
      }

      // Flagged orders (commission already deducted / error) skip payout:
      // once approved, move straight to 'paid' so they don't show up for reconciliation
      if (body.status === 'approved' && (order.commissionDeducted || order.isError)) {
        order.status = 'paid';
      }
    } else {
      // CTV can only edit their own pending orders
      if (order.ctvEmail !== session.user.email) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'Cannot edit non-pending order' }, { status: 400 });
      }
      
      if (body.ctvName) order.ctvName = body.ctvName;
      if (body.customerEmail) order.customerEmail = body.customerEmail;
      if (body.courseDescription) order.courseDescription = body.courseDescription;
      if (body.orderValue) order.orderValue = body.orderValue;
      if (body.billImage) order.billImage = body.billImage;
      if (body.selectedFolders) order.selectedFolders = body.selectedFolders;
      if (body.commissionDeducted !== undefined) order.commissionDeducted = !!body.commissionDeducted;
      if (body.isError !== undefined) order.isError = !!body.isError;
      // Error orders are always 0đ
      if (order.isError) order.orderValue = 0;
    }

    await order.save();

    return NextResponse.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    console.error('PUT /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Admin only
export async function DELETE(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
