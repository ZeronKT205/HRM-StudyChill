import ComboFolder from '@/lib/models/ComboFolder';
import Order from '@/lib/models/Order';
import { shareMultipleFolders } from '@/lib/drive';

/**
 * Auto-grant Drive access for a paid combo registration.
 *
 * Runs right after SePay confirms payment. Looks up the combo → folder mapping the
 * admin configured; if the combo is opted in and has folders, it shares them with
 * the student, records an Order (already commission-paid, same shape the manual
 * approve route produces) and marks the registration processed so it doesn't sit
 * in the admin queue.
 *
 * Deliberately conservative — it bails out (leaving the manual flow untouched) when:
 *   - the combo has no mapping, is disabled, or maps to zero folders
 *   - the registration was already processed
 *   - every Drive share failed (nothing was actually granted)
 *
 * Never throws: payment confirmation must not fail because of a Drive/DB hiccup.
 *
 * @param {import('mongoose').Document} registration - The paid Registration doc.
 * @returns {Promise<{granted: boolean, folders: Array, reason?: string}>}
 */
export async function autoGrantComboFolders(registration) {
  try {
    if (!registration || registration.processed) {
      return { granted: false, folders: [], reason: 'already-processed' };
    }
    if (registration.type === 'trial') {
      return { granted: false, folders: [], reason: 'trial' };
    }
    // Guard: an empty comboId would make the lookup below match an arbitrary mapping.
    if (!registration.comboId) {
      return { granted: false, folders: [], reason: 'no-combo-id' };
    }

    const mapping = await ComboFolder.findOne({ comboId: registration.comboId }).lean();
    if (!mapping || !mapping.enabled) {
      return { granted: false, folders: [], reason: 'combo-not-configured' };
    }

    const folders = (mapping.folders || []).filter((f) => f.folderId);
    if (folders.length === 0) {
      return { granted: false, folders: [], reason: 'no-folders' };
    }

    // Grant Drive access to the student's email.
    const shareResults = await shareMultipleFolders(folders.map((f) => f.folderId), registration.email);

    const driveShareStatus = shareResults.map((r) => ({
      folderId: r.folderId,
      folderName: folders.find((f) => f.folderId === r.folderId)?.folderName || '',
      status: r.success ? 'success' : 'failed',
      error: r.error || '',
    }));

    const anySucceeded = driveShareStatus.some((s) => s.status === 'success');
    if (!anySucceeded) {
      // Nothing was granted — leave the registration for an admin to handle manually.
      console.error(`[AUTO-GRANT] All shares failed for registration ${registration._id}`);
      return { granted: false, folders: [], reason: 'share-failed' };
    }

    const courseDescription = registration.note
      ? `${registration.comboName} — ${registration.note}`
      : registration.comboName;

    // Mirror the manual approve route: an Order already marked paid / commission-deducted.
    const order = await Order.create({
      ctvName: 'Hệ thống (tự động)',
      ctvEmail: (process.env.ADMIN_EMAIL || 'system@studychill.local').toLowerCase(),
      customerEmail: registration.email,
      courseDescription,
      orderValue: registration.amount,
      selectedFolders: folders,
      driveShareStatus,
      status: 'paid',
      commissionDeducted: true,
      adminNote: `Tự động cấp quyền ngay sau thanh toán (${registration.desCode})`,
    });

    registration.processed = true;
    registration.processedAt = new Date();
    registration.approvedBy = 'system:auto';
    registration.orderId = order._id;
    registration.selectedFolders = folders;
    registration.driveShareStatus = driveShareStatus;
    registration.status = 'done';
    await registration.save();

    console.log(`[AUTO-GRANT] ✓ Granted ${folders.length} folder(s) to ${registration.email} for combo ${registration.comboId}`);

    // Only advertise folders that actually got shared.
    const grantedFolders = folders.filter((f) =>
      driveShareStatus.find((s) => s.folderId === f.folderId)?.status === 'success'
    );

    return { granted: true, folders: grantedFolders };
  } catch (error) {
    console.error('[AUTO-GRANT] error:', error?.message);
    return { granted: false, folders: [], reason: 'error' };
  }
}
