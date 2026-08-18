import mongoose from 'mongoose';

const FolderSelectionSchema = new mongoose.Schema({
  folderId: { type: String, required: true },
  folderName: { type: String, required: true },
  folderPath: { type: String, default: '' },
}, { _id: false });

// Maps a combo (from src/lib/combos.js) to the Drive folders a student should be
// granted. When `enabled` is true and `folders` is non-empty, the SePay webhook
// auto-grants those folders the moment payment lands — no admin approval needed.
//
// Combos with `requiresNote: true` (COMBO 3 MÔN, COMBO 1 MÔN, LẺ 1 GIÁO VIÊN...)
// let the student pick subjects/teachers as free text, so a fixed folder set can't
// be inferred. Those should normally stay disabled and keep the manual flow.
const ComboFolderSchema = new mongoose.Schema({
  comboId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  comboName: {
    type: String,
    default: '',
    trim: true,
  },
  folders: [FolderSelectionSchema],
  // Master switch — admin must opt a combo in before anything is auto-granted.
  enabled: {
    type: Boolean,
    default: false,
  },
  updatedBy: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.models.ComboFolder || mongoose.model('ComboFolder', ComboFolderSchema);
