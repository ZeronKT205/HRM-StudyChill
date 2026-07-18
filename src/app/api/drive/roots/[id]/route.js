import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import DriveRoot from '@/lib/models/DriveRoot';

export const dynamic = 'force-dynamic';

// DELETE /api/drive/roots/[id] — admin: remove a root folder
export async function DELETE(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const removed = await DriveRoot.findByIdAndDelete(id);
    if (!removed) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục gốc' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa thư mục gốc' });
  } catch (error) {
    console.error('DELETE /api/drive/roots/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
