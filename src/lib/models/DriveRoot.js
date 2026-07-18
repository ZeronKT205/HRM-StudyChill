import mongoose from 'mongoose';

// A root Google Drive folder to scan when syncing the course folder tree.
// Admin can add/remove these; env DRIVE_FOLDER_1/2 seed the list on first use.
const DriveRootSchema = new mongoose.Schema({
  folderId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.DriveRoot || mongoose.model('DriveRoot', DriveRootSchema);
