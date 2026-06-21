import mongoose from 'mongoose';

const FolderSelectionSchema = new mongoose.Schema({
  folderId: { type: String, required: true },
  folderName: { type: String, required: true },
  folderPath: { type: String, default: '' },
}, { _id: false });

const DriveShareStatusSchema = new mongoose.Schema({
  folderId: { type: String, required: true },
  folderName: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  error: { type: String, default: '' },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  ctvName: {
    type: String,
    required: true,
    trim: true,
  },
  ctvEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  courseDescription: {
    type: String,
    required: true,
    trim: true,
  },
  orderValue: {
    type: Number,
    required: true,
    min: 0,
  },
  billImage: {
    type: String,
    default: '',
  },
  selectedFolders: [FolderSelectionSchema],
  driveShareStatus: [DriveShareStatusSchema],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
  },
  adminNote: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Index for querying by CTV
OrderSchema.index({ ctvEmail: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
