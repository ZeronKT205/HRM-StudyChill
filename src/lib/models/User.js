import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'ctv'],
    default: 'ctv',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  bankName: {
    type: String,
    default: '',
    trim: true,
  },
  bankAccountNumber: {
    type: String,
    default: '',
    trim: true,
  },
  bankAccountName: {
    type: String,
    default: '',
    trim: true,
  },
  qrCodeImage: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
