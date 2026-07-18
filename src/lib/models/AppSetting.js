import mongoose from 'mongoose';

// Simple key/value store for one-off app settings/flags.
const AppSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
  timestamps: true,
});

export default mongoose.models.AppSetting || mongoose.model('AppSetting', AppSettingSchema);
