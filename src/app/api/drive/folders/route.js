import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/utils';
import { loadFullDriveFolderTree } from '@/lib/drive';
import connectDB from '@/lib/mongodb';
import FolderTree from '@/lib/models/FolderTree';

// GET /api/drive/folders - Get cached folder tree from DB
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const tree = await FolderTree.findOne().sort({ updatedAt: -1 });

    if (!tree) {
      return NextResponse.json({ folders: [], lastSyncedAt: null });
    }

    // Safeguard: Filter out "Tài Liệu Tổng Hợp" case-insensitively from DB output too
    const cleanFolders = (tree.treeData || []).map(root => ({
      ...root,
      children: (root.children || []).filter(
        child => child.name && child.name.toLowerCase().trim() !== 'tài liệu tổng hợp'
      )
    }));

    return NextResponse.json({ 
      folders: cleanFolders, 
      lastSyncedAt: tree.lastSyncedAt 
    });
  } catch (error) {
    console.error('GET /api/drive/folders error:', error);
    return NextResponse.json(
      { error: 'Failed to load folders: ' + error.message },
      { status: 500 }
    );
  }
}

// POST /api/drive/folders - Admin only sync from Google Drive to DB
export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load full 3-level tree from Drive API
    const fullTree = await loadFullDriveFolderTree();

    // Check if all roots failed
    const allFailed = fullTree.length > 0 && fullTree.every(folder => folder.error);
    if (allFailed) {
      const errorMsg = fullTree.map(f => `${f.id}: ${f.error}`).join('; ');
      return NextResponse.json({ 
        error: `Đồng bộ thất bại. Không tìm thấy thư mục nào trên Drive. Lỗi chi tiết: ${errorMsg}. Vui lòng chia sẻ các thư mục này với email Service Account dưới quyền 'Người xem' (Viewer).` 
      }, { status: 400 });
    }

    await connectDB();
    
    // Save to DB (overwrite or create)
    const tree = await FolderTree.findOneAndUpdate(
      {},
      { 
        treeData: fullTree, 
        lastSyncedAt: new Date() 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Folder tree synced successfully from Google Drive',
      folders: tree.treeData,
      lastSyncedAt: tree.lastSyncedAt
    });
  } catch (error) {
    console.error('POST /api/drive/folders error:', error);
    return NextResponse.json(
      { error: 'Failed to sync folders: ' + error.message },
      { status: 500 }
    );
  }
}
