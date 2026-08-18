import { NextResponse } from 'next/server';
import { getAuthSession, isAdmin } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import ComboFolder from '@/lib/models/ComboFolder';
import { COMBOS, getComboById } from '@/lib/combos';

export const dynamic = 'force-dynamic';

// GET /api/combo-folders - Admin: every combo with its configured folders
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const saved = await ComboFolder.find({}).lean();
    const byId = new Map(saved.map((s) => [s.comboId, s]));

    // Always return the full combo list so the UI can render unconfigured ones too.
    const combos = COMBOS.map((combo) => {
      const config = byId.get(combo.id);
      return {
        comboId: combo.id,
        comboName: combo.name,
        price: combo.price,
        requiresNote: combo.requiresNote,
        noteLabel: combo.noteLabel,
        folders: config?.folders || [],
        enabled: !!config?.enabled,
        updatedAt: config?.updatedAt || null,
        updatedBy: config?.updatedBy || '',
      };
    });

    return NextResponse.json({ combos });
  } catch (error) {
    console.error('GET /api/combo-folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/combo-folders - Admin: save one combo's folder mapping
export async function PUT(request) {
  try {
    const session = await getAuthSession();
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { comboId, folders, enabled } = body;

    const combo = getComboById(comboId);
    if (!combo) {
      return NextResponse.json({ error: 'Combo không hợp lệ.' }, { status: 400 });
    }

    const cleanFolders = (Array.isArray(folders) ? folders : [])
      .filter((f) => f && f.folderId)
      .map((f) => ({
        folderId: String(f.folderId),
        folderName: String(f.folderName || ''),
        folderPath: String(f.folderPath || ''),
      }));

    // Auto-grant with no folders would silently do nothing — reject it explicitly.
    if (enabled && cleanFolders.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một thư mục trước khi bật tự động cấp quyền.' },
        { status: 400 }
      );
    }

    const config = await ComboFolder.findOneAndUpdate(
      { comboId },
      {
        $set: {
          comboId,
          comboName: combo.name,
          folders: cleanFolders,
          enabled: !!enabled,
          updatedBy: session.user.email.toLowerCase(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ config, message: 'Đã lưu cấu hình khóa học.' });
  } catch (error) {
    console.error('PUT /api/combo-folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
