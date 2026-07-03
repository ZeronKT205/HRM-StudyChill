import mongoose from 'mongoose';

// Public course-combo registration submitted by a student from /dang-ky-combo.
const RegistrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    // Required now: used to send confirmation emails (verifies the address).
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  comboId: {
    type: String,
    required: true,
  },
  comboName: {
    type: String,
    required: true,
  },
  comboPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  note: {
    type: String,
    default: '',
    trim: true,
  },

  // ===== Payment / verification =====
  // Amount to be transferred (mirrors comboPrice at time of registration).
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  // Unique anti-collision transfer memo, e.g. STUDYCHILL<idPart><rand>.
  // Students put this in the bank transfer content; SePay webhook matches on it.
  desCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // Full VietQR image URL rendered on the payment page.
  qrUrl: {
    type: String,
    default: '',
  },
  // Payment lifecycle, independent from the admin workflow `status` below.
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'expired'],
    default: 'pending',
    index: true,
  },
  paidAt: { type: Date, default: null },
  // QR session expiry (createdAt + PAYMENT_WINDOW_MINUTES).
  expiresAt: { type: Date, default: null },

  // SePay webhook audit trail
  sepayTxId: { type: String, default: '' },
  sepayRef: { type: String, default: '' },
  sepayRaw: { type: mongoose.Schema.Types.Mixed, default: null },

  // Which notification emails have been sent (avoid duplicates)
  receivedEmailSent: { type: Boolean, default: false },
  confirmEmailSent: { type: Boolean, default: false },

  // ===== Admin workflow status =====
  status: {
    type: String,
    enum: ['new', 'contacted', 'done', 'cancelled'],
    default: 'new',
  },
}, {
  timestamps: true,
});

RegistrationSchema.index({ status: 1, createdAt: -1 });
RegistrationSchema.index({ paymentStatus: 1, createdAt: -1 });

export default mongoose.models.Registration || mongoose.model('Registration', RegistrationSchema);
