import mongoose from 'mongoose';

const FolderTreeSchema = new mongoose.Schema({
  treeData: {
    type: Array,
    required: true,
    default: [],
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.FolderTree || mongoose.model('FolderTree', FolderTreeSchema);
