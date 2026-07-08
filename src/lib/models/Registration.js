import mongoose from 'mongoose';

// Public registration submitted from /dang-ky-combo — either a paid combo
// purchase (type: 'combo') or a free trial request (type: 'trial').
const RegistrationSchema = new mongoose.Schema({
  // Distinguishes a paid combo registration from a free trial request.
  type: {
    type: String,
    enum: ['combo', 'trial'],
    default: 'combo',
    index: true,
  },
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

  // ===== Payment-reminder drip campaign (combo, chờ thanh toán) =====
  // dripBaseAt: mốc thời gian dùng để tính các chạm. Đơn mới = createdAt;
  // dữ liệu cũ sẽ được set = thời điểm cron chạy lần đầu (xử lý riêng).
  dripBaseAt: { type: Date, default: null },
  dripTouch: { type: Number, default: 0 }, // 0..3 số email nhắc đã gửi
  dripLastSentAt: { type: Date, default: null },
  // Người dùng bấm hủy nhận email nhắc.
  unsubscribed: { type: Boolean, default: false },

  // ===== Admin processing (duyệt khóa học) =====
  // processed = admin has granted Drive access and created the corresponding Order.
  processed: { type: Boolean, default: false, index: true },
  processedAt: { type: Date, default: null },
  approvedBy: { type: String, default: '' }, // admin email who approved
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  // Folders granted to the student (mirrors Order.selectedFolders).
  selectedFolders: [{
    folderId: { type: String },
    folderName: { type: String },
    folderPath: { type: String, default: '' },
  }],
  driveShareStatus: [{
    folderId: { type: String },
    folderName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    error: { type: String, default: '' },
  }],

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
RegistrationSchema.index({ paymentStatus: 1, processed: 1 });
// For the drip cron: quickly find pending combos still in the campaign.
RegistrationSchema.index({ type: 1, paymentStatus: 1, dripTouch: 1 });

export default mongoose.models.Registration || mongoose.model('Registration', RegistrationSchema);
