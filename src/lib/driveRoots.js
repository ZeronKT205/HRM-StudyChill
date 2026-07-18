import connectDB from '@/lib/mongodb';
import DriveRoot from '@/lib/models/DriveRoot';
import AppSetting from '@/lib/models/AppSetting';
import { getDriveFolderInfo } from '@/lib/drive';

const SEED_KEY = 'driveRootsSeeded';

/**
 * One-time migration: copy env DRIVE_FOLDER_1/2 into the DriveRoot collection so
 * the defaults become editable. Guarded by a flag so removing all roots later
 * doesn't re-seed them.
 */
export async function ensureRootsSeeded() {
  await connectDB();

  const flag = await AppSetting.findOne({ key: SEED_KEY }).lean();
  if (flag && flag.value) return;

  const envIds = [process.env.DRIVE_FOLDER_1, process.env.DRIVE_FOLDER_2].filter(Boolean);
  for (const id of envIds) {
    const exists = await DriveRoot.findOne({ folderId: id }).lean();
    if (exists) continue;
    let name = '';
    try {
      const info = await getDriveFolderInfo(id);
      name = info?.name || '';
    } catch {
      /* not accessible right now — still register it so admin can see/fix it */
    }
    try {
      await DriveRoot.create({ folderId: id, name });
    } catch {
      /* ignore duplicates / races */
    }
  }

  await AppSetting.updateOne({ key: SEED_KEY }, { $set: { value: true } }, { upsert: true });
}

/** Root folder IDs currently configured (after seeding env defaults once). */
export async function getRootFolderIds() {
  await connectDB();
  await ensureRootsSeeded();
  const roots = await DriveRoot.find().sort({ createdAt: 1 }).lean();
  return roots.map((r) => r.folderId);
}

/** Extract a Drive folder ID from a raw ID or a Drive URL. */
export function extractFolderId(input) {
  const s = String(input || '').trim();
  const m = s.match(/[-\w]{20,}/); // Drive IDs are long [-\w] tokens
  return m ? m[0] : s;
}
