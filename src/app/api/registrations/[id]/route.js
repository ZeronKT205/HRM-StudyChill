import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Registration from '@/lib/models/Registration';

const ALLOWED_STATUS = ['new', 'contacted', 'done', 'cancelled'];

// PUT /api/registrations/[id] - Admin only: update status / note
export async function PUT(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const registration = await Registration.findById(id);
    if (!registration) {
      return NextResponse.json({ error: 'Không tìm thấy đăng ký' }, { status: 404 });
    }

    if (body.status) {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }
      registration.status = body.status;
    }
    if (body.note !== undefined) registration.note = body.note;

    await registration.save();

    return NextResponse.json({ registration, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('PUT /api/registrations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/registrations/[id] - Admin only
export async function DELETE(request, { params }) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const registration = await Registration.findByIdAndDelete(id);
    if (!registration) {
      return NextResponse.json({ error: 'Không tìm thấy đăng ký' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa đăng ký' });
  } catch (error) {
    console.error('DELETE /api/registrations/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
