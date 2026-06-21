'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, Phone, Save, Loader2, CheckCircle2, CreditCard } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    qrCodeImage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/users?mode=me');
        const data = await res.json();
        if (data.user) {
          setFormData({
            name: data.user.name || '',
            phone: data.user.phone || '',
            bankName: data.user.bankName || '',
            bankAccountNumber: data.user.bankAccountNumber || '',
            bankAccountName: data.user.bankAccountName || '',
            qrCodeImage: data.user.qrCodeImage || '',
          });
          if (data.user.qrCodeImage) {
            setQrPreview(data.user.qrCodeImage);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    if (session) {
      loadProfile();
    }
  }, [session]);

  function handleQrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn (max 5MB)');
      return;
    }

    // Set local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setQrPreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to R2
    setUploadingQr(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch('/api/upload', {
      method: 'POST',
      body: uploadData,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setFormData(prev => ({ ...prev, qrCodeImage: data.url }));
      })
      .catch((err) => {
        console.error('Error uploading QR code:', err);
        alert(`Lỗi tải ảnh QR lên R2: ${err.message}`);
        setQrPreview(formData.qrCodeImage || null);
      })
      .finally(() => {
        setUploadingQr(false);
      });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errData = await res.json();
        alert(`Lỗi khi lưu: ${errData.error || 'Không rõ nguyên nhân'}`);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
        <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)' }} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Hồ Sơ Cá Nhân</h1>
          <p className="page-subtitle">Quản lý thông tin cá nhân và tài khoản thanh toán nhận hoa hồng</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 600 }}>
          {/* Profile Card */}
          <div className="card mb-6" style={{ cursor: 'default' }}>
            <div className="flex items-center gap-4 mb-6">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  referrerPolicy="no-referrer"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    border: '3px solid var(--border-dark)',
                    boxShadow: 'var(--shadow-neo-sm)',
                  }}
                />
              )}
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)' }}>
                  {session?.user?.name}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {session?.user?.email}
                </p>
                <span className={`badge ${session?.user?.role === 'admin' ? 'badge-admin' : 'badge-ctv'}`}
                  style={{ marginTop: 4 }}>
                  {session?.user?.role === 'admin' ? '👑 Admin' : '👤 CTV'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="card" style={{ cursor: 'default' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
              marginBottom: 'var(--space-6)',
            }}>
              Chỉnh sửa thông tin
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Họ và tên
                </label>
                <input
                  type="text"
                  id="profile-name"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Email
                </label>
                <input
                  type="email"
                  id="profile-email"
                  className="form-input"
                  value={session?.user?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <span className="form-helper">Email được liên kết từ Google và không thể thay đổi</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">
                  <Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="profile-phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Nhập số điện thoại..."
                />
              </div>

              {/* Payment Account Section */}
              <div style={{ borderTop: '2px dashed var(--border-medium)', margin: 'var(--space-6) 0' }} />
              
              <h4 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'var(--text-base)',
                marginBottom: 'var(--space-2)',
                color: 'var(--color-herb)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <CreditCard size={18} />
                💳 Thông tin thanh toán (Nhận Hoa Hồng)
              </h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                Nhập thông tin tài khoản ngân hàng của bạn để Admin chuyển khoản đối soát doanh thu.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-bankName">
                  Tên ngân hàng
                </label>
                <input
                  type="text"
                  id="profile-bankName"
                  className="form-input"
                  value={formData.bankName}
                  onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Ví dụ: Vietcombank, MB Bank, Techcombank..."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-bankAccountNumber">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  id="profile-bankAccountNumber"
                  className="form-input"
                  value={formData.bankAccountNumber}
                  onChange={e => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                  placeholder="Nhập số tài khoản ngân hàng..."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-bankAccountName">
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  id="profile-bankAccountName"
                  className="form-input"
                  value={formData.bankAccountName}
                  onChange={e => setFormData(prev => ({ ...prev, bankAccountName: e.target.value.toUpperCase() }))}
                  placeholder="Ví dụ: NGUYEN VAN A"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Ảnh Mã QR Thanh Toán
                </label>
                <label htmlFor="qrUpload" className={`file-upload-zone ${qrPreview ? 'has-file' : ''} ${uploadingQr ? 'disabled' : ''}`} style={{ borderStyle: 'dashed', minHeight: 120, cursor: uploadingQr ? 'not-allowed' : 'pointer' }}>
                  {uploadingQr ? (
                    <div className="flex flex-col items-center justify-center" style={{ padding: '10px 0' }}>
                      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)', margin: '0 auto 5px auto' }} />
                      <div className="file-upload-text" style={{ fontSize: 'var(--text-sm)' }}>Đang tải mã QR lên Cloudflare R2...</div>
                    </div>
                  ) : qrPreview ? (
                    <div className="file-preview" style={{ padding: '8px' }}>
                      <img src={qrPreview.startsWith('data:') ? qrPreview : `/api/images?url=${encodeURIComponent(qrPreview)}`} alt="QR code" style={{ maxHeight: 120, maxWidth: 120, objectFit: 'contain', borderRadius: 8 }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>✅ Đã tải lên mã QR</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Click để thay đổi</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '15px 0' }}>
                      <div className="file-upload-text">Click hoặc kéo thả ảnh mã QR nhận tiền vào đây</div>
                      <div className="file-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</div>
                    </div>
                  )}
                  <input
                    type="file"
                    id="qrUpload"
                    accept="image/*"
                    onChange={handleQrUpload}
                    disabled={uploadingQr}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={saving || uploadingQr}
                id="save-profile-btn"
                style={{ marginTop: 'var(--space-4)' }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Đang lưu hồ sơ...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={16} />
                    Đã lưu thành công!
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Lưu hồ sơ & Thông tin thanh toán
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
