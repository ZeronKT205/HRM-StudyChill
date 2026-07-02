'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FolderPicker from '@/components/FolderPicker';
import {
  User,
  Mail,
  FileText,
  DollarSign,
  Upload,
  FolderOpen,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Image,
  Coins,
} from 'lucide-react';

export default function NewOrderPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    ctvName: '',
    customerEmail: '',
    courseDescription: '',
    orderValue: '',
    billImage: '',
    commissionDeducted: false,
    isError: false,
  });
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [success, setSuccess] = useState(false);
  const [billPreview, setBillPreview] = useState(null);
  const [isValueFocused, setIsValueFocused] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setFormData(prev => ({ ...prev, ctvName: session.user.name }));
    }
  }, [session]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }

  function handleValueChange(e) {
    // Format number with commas
    const raw = e.target.value.replace(/[^\d]/g, '');
    setFormData(prev => ({ ...prev, orderValue: raw }));
    if (errors.orderValue) {
      setErrors(prev => ({ ...prev, orderValue: null }));
    }
  }

  function formatDisplayValue(value) {
    if (!value) return '';
    return Number(value).toLocaleString('vi-VN');
  }

  function handleFlagChange(e) {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
      // Error orders are always 0đ
      ...(name === 'isError' ? { orderValue: checked ? '0' : '' } : {}),
    }));
    if (name === 'isError' && errors.orderValue) {
      setErrors(prev => ({ ...prev, orderValue: null }));
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, billImage: 'File quá lớn (max 5MB)' }));
      return;
    }

    // Set preview locally first
    const reader = new FileReader();
    reader.onload = (event) => {
      setBillPreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Perform R2 upload
    setUploadingFile(true);
    if (errors.billImage) {
      setErrors(prev => ({ ...prev, billImage: null }));
    }

    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch('/api/upload', {
      method: 'POST',
      body: uploadData,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setFormData(prev => ({ ...prev, billImage: data.url }));
      })
      .catch((err) => {
        console.error('Error uploading bill image:', err);
        setErrors(prev => ({ ...prev, billImage: `Lỗi tải ảnh lên R2: ${err.message}` }));
        setBillPreview(null);
      })
      .finally(() => {
        setUploadingFile(false);
      });
  }

  function validate() {
    const newErrors = {};
    if (!formData.ctvName.trim()) newErrors.ctvName = 'Vui lòng nhập tên CTV';
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Vui lòng nhập email khách hàng';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email không hợp lệ';
    }
    if (!formData.courseDescription.trim()) newErrors.courseDescription = 'Vui lòng mô tả khóa học';
    if (!formData.isError && (!formData.orderValue || Number(formData.orderValue) <= 0)) {
      newErrors.orderValue = 'Vui lòng nhập giá trị đơn hàng';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSuccess(false);

    try {
      // Create order in DB (Drive sharing is handled in backend upon admin approval)
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          orderValue: Number(formData.orderValue),
          selectedFolders,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      setSuccess(true);

      // Redirect after 3s
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 3000);
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Nhập Đơn Hàng Mới</h1>
          <p className="page-subtitle">Điền thông tin đơn hàng và chọn khóa học cần cấp quyền</p>
        </div>
      </div>

      <div className="page-body">
        {success && (
          <div className="card mb-6" style={{
            background: '#e8f5e6',
            cursor: 'default',
          }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} style={{ color: 'var(--color-herb)' }} />
              <div>
                <strong style={{ fontFamily: 'var(--font-display)' }}>
                  ✅ Đơn hàng đã được tạo thành công và đang chờ duyệt!
                </strong>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Google Drive sẽ được tự động chia sẻ và email kích hoạt sẽ được gửi tới khách hàng sau khi Admin phê duyệt. Đang chuyển hướng...
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            {/* Left Column - Form Fields */}
            <div className="flex flex-col gap-6">
              <div className="card" style={{ cursor: 'default' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--text-lg)',
                  marginBottom: 'var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}>
                  <FileText size={20} /> Thông tin đơn hàng
                </h3>

                <div className="flex flex-col gap-4">
                  {/* CTV Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="ctvName">
                      <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Họ và Tên Cộng Tác Viên (CTV) <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="ctvName"
                      name="ctvName"
                      className={`form-input ${errors.ctvName ? 'error' : ''}`}
                      value={formData.ctvName}
                      onChange={handleChange}
                      placeholder="Nhập tên CTV..."
                    />
                    {errors.ctvName && <span className="form-error">{errors.ctvName}</span>}
                  </div>

                  {/* Customer Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="customerEmail">
                      <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Email Chính Thức của Khách Hàng <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      className={`form-input ${errors.customerEmail ? 'error' : ''}`}
                      value={formData.customerEmail}
                      onChange={handleChange}
                      placeholder="example@gmail.com"
                    />
                    {errors.customerEmail && <span className="form-error">{errors.customerEmail}</span>}
                    <span className="form-helper">
                      Email này sẽ được cấp quyền truy cập thư mục Drive đã chọn
                    </span>
                  </div>

                  {/* Course Description */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="courseDescription">
                      <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Mô Tả Chi Tiết Khóa Học / Sản Phẩm <span className="required">*</span>
                    </label>
                    <textarea
                      id="courseDescription"
                      name="courseDescription"
                      className={`form-textarea ${errors.courseDescription ? 'error' : ''}`}
                      value={formData.courseDescription}
                      onChange={handleChange}
                      placeholder="Mô tả chi tiết khóa học hoặc sản phẩm khách hàng đã mua..."
                      rows={3}
                    />
                    {errors.courseDescription && <span className="form-error">{errors.courseDescription}</span>}
                  </div>

                  {/* Order Value */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="orderValue">
                      <DollarSign size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Tổng Giá Trị Đơn Hàng (VNĐ) <span className="required">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        id="orderValue"
                        name="orderValue"
                        className={`form-input ${errors.orderValue ? 'error' : ''}`}
                        value={formData.isError ? '0' : (isValueFocused ? formData.orderValue : formatDisplayValue(formData.orderValue))}
                        onChange={handleValueChange}
                        onFocus={() => setIsValueFocused(true)}
                        onBlur={() => setIsValueFocused(false)}
                        placeholder="Nhập số tiền (ví dụ: 12000000)..."
                        disabled={formData.isError}
                        style={{ paddingRight: 50, ...(formData.isError ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                      }}>
                        VNĐ
                      </span>
                    </div>
                    {formData.orderValue && (
                      <span className="form-helper" style={{ color: 'var(--color-herb)', fontWeight: 600, marginTop: 4, display: 'block' }}>
                        Định dạng: {formatDisplayValue(formData.orderValue)} VNĐ
                      </span>
                    )}
                    {errors.orderValue && <span className="form-error">{errors.orderValue}</span>}
                  </div>

                  {/* Order Flags */}
                  <div className="form-group">
                    <label className="form-label">Tùy chọn xử lý đơn</label>
                    <div className="flex flex-col gap-3">
                      <label htmlFor="commissionDeducted" style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                        cursor: 'pointer',
                        padding: 'var(--space-3)',
                        border: `1.5px solid ${formData.commissionDeducted ? 'var(--color-herb)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--border-radius-md)',
                        background: formData.commissionDeducted ? '#e8f5e6' : 'transparent',
                      }}>
                        <input
                          type="checkbox"
                          id="commissionDeducted"
                          name="commissionDeducted"
                          className="folder-checkbox"
                          checked={formData.commissionDeducted}
                          onChange={handleFlagChange}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Coins size={14} /> Đã trừ hoa hồng
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                            Đơn này đã trừ hoa hồng sẵn — sau khi Admin duyệt sẽ tự chuyển sang &quot;Đã trả hoa hồng&quot;, không cần đối soát nữa
                          </span>
                        </div>
                      </label>

                      <label htmlFor="isError" style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                        cursor: 'pointer',
                        padding: 'var(--space-3)',
                        border: `1.5px solid ${formData.isError ? 'var(--color-coral)' : 'var(--border-light)'}`,
                        borderRadius: 'var(--border-radius-md)',
                        background: formData.isError ? '#fde8e8' : 'transparent',
                      }}>
                        <input
                          type="checkbox"
                          id="isError"
                          name="isError"
                          className="folder-checkbox"
                          checked={formData.isError}
                          onChange={handleFlagChange}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} /> Báo lỗi
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                            Đơn xử lý lỗi — giá trị đơn sẽ là 0đ, sau khi Admin duyệt sẽ tự chuyển sang &quot;Đã trả hoa hồng&quot;
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Bill Upload */}
                  <div className="form-group">
                    <label className="form-label">
                      <Image size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Tải Lên Ảnh Bill / Biên Lai Chuyển Khoản
                    </label>
                    <label htmlFor="billUpload" className={`file-upload-zone ${billPreview ? 'has-file' : ''} ${uploadingFile ? 'disabled' : ''}`}>
                      {uploadingFile ? (
                        <div className="flex flex-col items-center justify-center" style={{ padding: '20px 0' }}>
                          <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)', margin: '0 auto 10px auto' }} />
                          <div className="file-upload-text">Đang tải ảnh lên Cloudflare R2...</div>
                        </div>
                      ) : billPreview ? (
                        <div className="file-preview">
                          <img src={billPreview} alt="Bill preview" />
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>✅ Đã tải lên</p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              Click để thay đổi
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="file-upload-icon">
                            <Upload size={36} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div className="file-upload-text">
                            Click hoặc kéo thả ảnh vào đây
                          </div>
                          <div className="file-upload-hint">
                            PNG, JPG, JPEG (tối đa 5MB)
                          </div>
                        </>
                      )}
                      <input
                        type="file"
                        id="billUpload"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {errors.billImage && <span className="form-error">{errors.billImage}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Folder Picker */}
            <div className="flex flex-col gap-6">
              <div className="card" style={{ cursor: 'default' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--text-lg)',
                  marginBottom: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}>
                  <FolderOpen size={20} /> Chọn Khóa Học
                </h3>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-4)',
                  lineHeight: 1.5,
                }}>
                  Nhấn mở rộng thư mục gốc và môn học để chọn. Tick chọn <strong>theo gói môn</strong> hoặc <strong>theo giáo viên</strong>. Email khách hàng sẽ được tự động cấp quyền truy cập vào các thư mục đã chọn.
                </p>

                <FolderPicker
                  selectedFolders={selectedFolders}
                  onSelectionChange={setSelectedFolders}
                />
              </div>

              {/* Submit */}
              {errors.submit && (
                <div className="card" style={{ background: '#fde8e8', cursor: 'default', border: '2px solid var(--color-coral)' }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} style={{ color: 'var(--color-coral)' }} />
                    <span style={{ fontWeight: 600, color: '#6b1c1c' }}>{errors.submit}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={submitting || uploadingFile}
                id="submit-order-btn"
                style={{ fontSize: 'var(--text-base)' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Đang gửi đơn hàng...
                  </>
                ) : uploadingFile ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Đang tải ảnh lên Cloudflare R2...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Gửi Đơn Hàng
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
