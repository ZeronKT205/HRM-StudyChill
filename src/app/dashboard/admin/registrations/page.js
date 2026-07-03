'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
} from 'lucide-react';

const STATUS_CONFIG = {
  new: { label: 'Mới', class: 'badge-pending' },
  contacted: { label: 'Đã liên hệ', class: 'badge-paid' },
  done: { label: 'Hoàn tất', class: 'badge-approved' },
  cancelled: { label: 'Đã hủy', class: 'badge-rejected' },
};

const PAYMENT_CONFIG = {
  pending: { label: 'Chờ thanh toán', class: 'badge-pending' },
  paid: { label: 'Đã thanh toán', class: 'badge-approved' },
  expired: { label: 'Hết hạn', class: 'badge-rejected' },
};

export default function AdminRegistrationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter]);

  async function fetchRegistrations() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 15,
        status: statusFilter,
      });
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

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: data.registration.status } : r))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        fetchRegistrations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
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
          <p className="page-subtitle">Danh sách học sinh đăng ký combo từ trang công khai</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          {['all', 'new', 'contacted', 'done', 'cancelled'].map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setStatusFilter(status);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              {status === 'all' ? 'Tất cả' : STATUS_CONFIG[status]?.label}
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
              <div className="empty-state-title">Chưa có lượt đăng ký nào</div>
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
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => {
                    const statusInfo = STATUS_CONFIG[r.status] || STATUS_CONFIG.new;
                    return (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{r.fullName}</div>
                          {r.note && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                          {(() => {
                            const p = PAYMENT_CONFIG[r.paymentStatus] || PAYMENT_CONFIG.pending;
                            return <span className={`badge ${p.class}`}>{p.label}</span>;
                          })()}
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                          {formatDate(r.createdAt)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <select
                              className="form-input"
                              value={r.status}
                              disabled={updatingId === r._id}
                              onChange={(e) => updateStatus(r._id, e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', minWidth: 120 }}
                            >
                              <option value="new">Mới</option>
                              <option value="contacted">Đã liên hệ</option>
                              <option value="done">Hoàn tất</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
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

        {/* Delete confirm modal */}
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
                <button className="btn btn-danger" onClick={handleDelete} disabled={processing}>
                  {processing ? (
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
