import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/utils';
import { shareMultipleFolders } from '@/lib/drive';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// POST /api/drive/share - Share folders with customer email
export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, folderIds, orderId } = body;

    if (!email || !folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return NextResponse.json(
        { error: 'Email and folderIds are required' },
        { status: 400 }
      );
    }

    // Share all selected folders using Service Account
    const results = await shareMultipleFolders(folderIds, email);

    // Update order with share results if orderId provided
    if (orderId) {
      await connectDB();
      const order = await Order.findById(orderId);
      if (order) {
        order.driveShareStatus = results.map(r => ({
          folderId: r.folderId,
          folderName: '',
          status: r.success ? 'success' : 'failed',
          error: r.error || '',
        }));
        await order.save();
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Shared ${successCount}/${results.length} folders successfully`,
      results,
      successCount,
      failCount,
    });
  } catch (error) {
    console.error('POST /api/drive/share error:', error);
    return NextResponse.json(
      { error: 'Failed to share folders: ' + error.message },
      { status: 500 }
    );
  }
}
