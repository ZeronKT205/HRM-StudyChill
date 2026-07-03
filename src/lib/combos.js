// Combo data for the public course-registration page ("ĐĂNG KÍ COMBO 2K9 XPS").
// Shared between the public page, the registration API (server validates price
// and note requirement against this list — never trusts the client), and admin.
//
// requiresNote: true  -> student MUST specify which subjects/teachers they pick
//               false -> note is optional (full combos & ĐGNL/ĐGTD include everything)
// notePlaceholder: example text shown in the note field for that combo.

export const COMBOS = [
  {
    id: 'full-all',
    name: 'FULL MÔN + ĐGNL / ĐGTD',
    price: 299000,
    tagline: 'Trọn bộ tất cả — học gì cũng có',
    accent: 'herb',
    featured: true,
    badge: 'PHỔ BIẾN NHẤT',
    requiresNote: false,
    noteLabel: 'Ghi chú thêm',
    notePlaceholder: 'Ghi chú thêm cho tư vấn viên nếu cần (không bắt buộc)...',
    features: [
      'Trọn bộ 8 môn học',
      'Kèm luyện ĐGNL / ĐGTD',
      'Đầy đủ giáo viên các môn',
      'Cập nhật tài liệu mới liên tục',
    ],
  },
  {
    id: 'full-8',
    name: 'FULL 8 MÔN',
    price: 249000,
    tagline: 'Trọn bộ chương trình 8 môn',
    accent: 'radiate',
    requiresNote: false,
    noteLabel: 'Ghi chú thêm',
    notePlaceholder: 'Ghi chú thêm cho tư vấn viên nếu cần (không bắt buộc)...',
    features: [
      'Trọn bộ 8 môn học',
      'Đầy đủ giáo viên từng môn',
      'Cập nhật tài liệu mới',
    ],
  },
  {
    id: '3-mon',
    name: 'COMBO 3 MÔN',
    price: 199000,
    tagline: 'Tự chọn 3 môn bất kỳ',
    accent: 'sky',
    requiresNote: true,
    noteLabel: 'Các môn bạn chọn',
    notePlaceholder: 'VD: Môn Toán, Môn Văn, Môn Anh',
    features: [
      'Tự chọn 3 môn bất kỳ',
      'Đầy đủ giáo viên trong môn',
      'Cập nhật tài liệu mới',
    ],
  },
  {
    id: 'uu-dai-3gv',
    name: 'COMBO ƯU ĐÃI',
    price: 149000,
    tagline: '3 giáo viên tự chọn',
    accent: 'violet',
    requiresNote: true,
    noteLabel: 'Các giáo viên bạn chọn',
    notePlaceholder: 'VD: Toán thầy Đỗ Văn Đức, Văn Cô Sương Mai, Hóa thầy Thắng',
    features: [
      '3 giáo viên tự chọn',
      'Không giới hạn môn',
      'Trọn khóa của giáo viên đã chọn',
    ],
  },
  {
    id: 'dgnl-dgtd',
    name: 'COMBO ĐGNL / ĐGTD',
    price: 139000,
    tagline: 'Luyện đánh giá năng lực / tư duy',
    accent: 'gleam',
    requiresNote: false,
    noteLabel: 'Ghi chú thêm',
    notePlaceholder: 'Ghi rõ ĐGNL hay ĐGTD nếu cần (không bắt buộc)...',
    features: [
      'Trọn bộ ĐGNL / ĐGTD',
      'Tài liệu luyện đề bám sát',
      'Cập nhật đề mới',
    ],
  },
  {
    id: '1-mon',
    name: 'COMBO 1 MÔN',
    price: 119000,
    tagline: 'Tự chọn 1 môn',
    accent: 'sky',
    requiresNote: true,
    noteLabel: 'Môn bạn chọn',
    notePlaceholder: 'VD: Môn Toán',
    features: [
      'Tự chọn 1 môn bất kỳ',
      'Đầy đủ giáo viên trong môn',
    ],
  },
  {
    id: 'le-1gv',
    name: 'COMBO LẺ 1 GIÁO VIÊN',
    price: 69000,
    tagline: 'Chọn đúng 1 giáo viên',
    accent: 'coral',
    requiresNote: true,
    noteLabel: 'Giáo viên bạn chọn',
    notePlaceholder: 'VD: Toán thầy Đỗ Văn Đức',
    features: [
      'Chọn 1 giáo viên bất kỳ',
      'Trọn khóa của giáo viên đó',
    ],
  },
];

export function getComboById(id) {
  return COMBOS.find((c) => c.id === id) || null;
}

export function formatComboPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
}

// Maps a combo's `accent` key to concrete palette colors (matches globals.css tokens).
export const ACCENT_COLORS = {
  herb: { fg: '#6a8042', bg: '#e8f5e6' },
  radiate: { fg: '#ed7a13', bg: '#fef0e0' },
  sky: { fg: '#5b9bd5', bg: '#e3f0fa' },
  violet: { fg: '#8b6cc1', bg: '#f3e8ff' },
  gleam: { fg: '#a18412', bg: '#fff4c8' },
  coral: { fg: '#e96d6d', bg: '#fde8e8' },
};
