import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import DriveRoot from '@/lib/models/DriveRoot';
import { getDriveFolderInfo, getServiceAccountEmail } from '@/lib/drive';
import { ensureRootsSeeded, extractFolderId } from '@/lib/driveRoots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/drive/roots — admin: list configured root folders
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await ensureRootsSeeded();
    const roots = await DriveRoot.find().sort({ createdAt: 1 }).lean();

    return NextResponse.json({
      roots: roots.map((r) => ({ id: String(r._id), folderId: r.folderId, name: r.name })),
      serviceAccountEmail: getServiceAccountEmail(),
    });
  } catch (error) {
    console.error('GET /api/drive/roots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/drive/roots — admin: add a root folder (by ID or Drive URL)
export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await ensureRootsSeeded();

    const body = await request.json();
    const folderId = extractFolderId(body.folderId);
    if (!folderId) {
      return NextResponse.json({ error: 'Vui lòng nhập link hoặc ID thư mục.' }, { status: 400 });
    }

    const exists = await DriveRoot.findOne({ folderId }).lean();
    if (exists) {
      return NextResponse.json({ error: 'Thư mục này đã có trong danh sách.' }, { status: 409 });
    }

    // Validate access + get the folder name via the service account.
    let info;
    try {
      info = await getDriveFolderInfo(folderId);
    } catch {
      const sa = getServiceAccountEmail();
      return NextResponse.json(
        {
          error:
            `Không truy cập được thư mục. Hãy chia sẻ thư mục này với Service Account` +
            (sa ? ` (${sa})` : '') + ` ở quyền "Người xem" (Viewer) rồi thử lại.`,
        },
        { status: 400 }
      );
    }

    if (info.mimeType && info.mimeType !== 'application/vnd.google-apps.folder') {
      return NextResponse.json({ error: 'Đây không phải là một thư mục Google Drive.' }, { status: 400 });
    }

    const root = await DriveRoot.create({ folderId, name: info.name || '' });
    return NextResponse.json(
      { root: { id: String(root._id), folderId: root.folderId, name: root.name }, message: 'Đã thêm thư mục gốc' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/drive/roots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
