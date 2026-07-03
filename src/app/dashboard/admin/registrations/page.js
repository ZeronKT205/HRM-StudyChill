'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FolderPicker from '@/components/FolderPicker';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  Settings2,
  CheckCircle2,
  FolderOpen,
  User,
  MessageSquare,
  X,
  AlertTriangle,
} from 'lucide-react';

const PAYMENT_CONFIG = {
  pending: { label: 'Chờ thanh toán', class: 'badge-pending' },
  paid: { label: 'Đã thanh toán', class: 'badge-approved' },
  expired: { label: 'Hết hạn', class: 'badge-rejected' },
};

const BUCKETS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'needs_processing', label: 'Cần xử lý' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'pending', label: 'Chờ thanh toán' },
];

export default function AdminRegistrationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState('needs_processing');

  // Process (duyệt) modal
  const [processTarget, setProcessTarget] = useState(null);
  const [processFolders, setProcessFolders] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, bucket]);

  async function fetchRegistrations() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 15, bucket });
      const res = await fetch(`/api/registrations?${params}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openProcess(reg) {
    setProcessTarget(reg);
    setProcessFolders([]);
    setProcessError('');
  }

  function closeProcess() {
    if (processing) return;
    setProcessTarget(null);
  }

  async function handleApprove() {
    if (!processTarget) return;
    if (processFolders.length === 0) {
      setProcessError('Vui lòng chọn ít nhất một khóa học để cấp quyền.');
      return;
    }
    setProcessing(true);
    setProcessError('');
    try {
      const res = await fetch(`/api/registrations/${processTarget._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedFolders: processFolders }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Duyệt thất bại');
      setProcessTarget(null);
      // Let the sidebar badge refresh immediately.
      window.dispatchEvent(new Event('registrations:changed'));
      fetchRegistrations();
    } catch (err) {
      setProcessError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/registrations/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        window.dispatchEvent(new Event('registrations:changed'));
        fetchRegistrations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (session?.user?.role !== 'admin') return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎓 Đăng Ký Khóa Học</h1>
          <p className="page-subtitle">Duyệt và cấp quyền khóa học cho học sinh đã đăng ký</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          {BUCKETS.map((b) => (
            <button
              key={b.key}
              className={`btn btn-sm ${bucket === b.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setBucket(b.key); setPagination((prev) => ({ ...prev, page: 1 })); }}
            >
              {b.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {pagination.total} lượt đăng ký
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : registrations.length === 0 ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Không có đơn nào trong mục này</div>
            </div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Liên hệ</th>
                    <th>Gói đăng ký</th>
                    <th>Giá</th>
                    <th>Thanh toán</th>
                    <th>Ngày</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => {
                    const pay = PAYMENT_CONFIG[r.paymentStatus] || PAYMENT_CONFIG.pending;
                    return (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{r.fullName}</div>
                          {r.note && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              📝 {r.note}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>
                          <a href={`tel:${r.phone}`} className="flex items-center gap-1" style={{ color: 'var(--color-herb)', fontWeight: 600 }}>
                            <Phone size={12} /> {r.phone}
                          </a>
                          {r.email && (
                            <div className="flex items-center gap-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              <Mail size={12} /> {r.email}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="flex items-center gap-1" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                            <GraduationCap size={14} style={{ color: 'var(--text-muted)' }} /> {r.comboName}
                          </span>
                          {r.desCode && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                              {r.desCode}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-herb)', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                          {formatVND(r.amount ?? r.comboPrice)}
                        </td>
                        <td>
                          <span className={`badge ${pay.class}`}>{pay.label}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                          {formatDate(r.createdAt)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {r.processed ? (
                              <span className="badge badge-approved"><CheckCircle2 size={12} /> Đã duyệt</span>
                            ) : (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => openProcess(r)}
                                style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                              >
                                <Settings2 size={14} /> Xử lý
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => setDeleteTarget(r)}
                              title="Xóa"
                              style={{ color: 'var(--color-coral)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Tiếp <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== PROCESS MODAL ===== */}
        {processTarget && (
          <div className="modal-backdrop" onClick={closeProcess}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div className="modal-header">
                <h3 className="modal-title">⚙️ Xử lý đơn đăng ký</h3>
                <button className="btn btn-ghost btn-icon" onClick={closeProcess} disabled={processing}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="grid-2">
                  {/* Left: combo / customer info */}
                  <div className="flex flex-col gap-3">
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      Thông tin đăng ký
                    </div>

                    <div style={{ background: 'var(--color-linen)', border: '2px solid var(--border-dark)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{processTarget.comboName}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-herb)', whiteSpace: 'nowrap' }}>
                          {formatVND(processTarget.amount ?? processTarget.comboPrice)}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                        {processTarget.desCode}
                      </div>
                    </div>

                    <InfoLine icon={<User size={14} />} label="Học sinh" value={processTarget.fullName} />
                    <InfoLine icon={<Phone size={14} />} label="SĐT" value={processTarget.phone} />
                    <InfoLine icon={<Mail size={14} />} label="Email" value={processTarget.email} />
                    {processTarget.note && (
                      <div className="form-group">
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MessageSquare size={14} /> Ghi chú của học sinh
                        </span>
                        <div style={{ background: 'white', border: '1.5px solid var(--border-light)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                          {processTarget.note}
                        </div>
                      </div>
                    )}

                    <div style={{ background: '#e8f5e6', border: '1.5px solid #a8e6a3', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: '#1a4a18' }}>
                      Khi duyệt: cấp quyền Drive + gửi email cho học sinh, tạo đơn hàng gắn tài khoản admin và tự động <strong>đã trả hoa hồng</strong>.
                    </div>
                  </div>

                  {/* Right: folder picker */}
                  <div className="flex flex-col gap-3">
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FolderOpen size={14} /> Chọn khóa học cần cấp quyền
                    </div>
                    <FolderPicker selectedFolders={processFolders} onSelectionChange={setProcessFolders} />
                  </div>
                </div>

                {processError && (
                  <div style={{ marginTop: 'var(--space-4)', background: '#fde8e8', border: '2px solid var(--color-coral)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} style={{ color: 'var(--color-coral)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#6b1c1c', fontSize: 'var(--text-sm)' }}>{processError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeProcess} disabled={processing}>Hủy</button>
                <button className="btn btn-primary" onClick={handleApprove} disabled={processing}>
                  {processing ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang duyệt...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Duyệt & cấp quyền</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== DELETE MODAL ===== */}
        {deleteTarget && (
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header" style={{ borderBottomColor: 'var(--color-coral)' }}>
                <h3 className="modal-title">🗑️ Xóa đăng ký</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  Bạn có chắc muốn xóa lượt đăng ký của <strong>{deleteTarget.fullName}</strong> ({deleteTarget.comboName})? Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang xóa...</>
                  ) : (
                    <><Trash2 size={16} /> Xóa</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
        {icon} {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
