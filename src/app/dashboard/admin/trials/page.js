'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Copy,
  Check,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';

const BUCKETS = [
  { key: 'needs_processing', label: 'Cần xử lý' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'all', label: 'Tất cả' },
];

export default function AdminTrialsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState('needs_processing');
  const [pendingCount, setPendingCount] = useState(0);

  const [copied, setCopied] = useState(false);
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [confirmProcess, setConfirmProcess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/registrations/pending-count', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount(data.trial || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'trial', bucket, page: pagination.page, limit: 15 });
      const res = await fetch(`/api/registrations?${params}`);
      const data = await res.json();
      setRows(data.registrations || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bucket, pagination.page]);

  useEffect(() => {
    fetchRows();
    fetchPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, pagination.page]);

  // Fetch all pending trial emails (across pages) for export/copy.
  async function fetchPendingEmails() {
    const res = await fetch('/api/registrations?type=trial&bucket=needs_processing&limit=1000', { cache: 'no-store' });
    const data = await res.json();
    return (data.registrations || []).map((r) => r.email).filter(Boolean);
  }

  async function openEmails() {
    setLoadingEmails(true);
    setActionMsg('');
    setCopied(false);
    setEmailsOpen(true);
    try {
      const emails = await fetchPendingEmails();
      setEmailList(emails);
    } catch (err) {
      setActionMsg('Không tải được danh sách email: ' + err.message);
      setEmailList([]);
    } finally {
      setLoadingEmails(false);
    }
  }

  async function copyEmailList() {
    try {
      await navigator.clipboard.writeText(emailList.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionMsg('Trình duyệt chặn copy — hãy bôi đen và Ctrl+C thủ công.');
    }
  }

  async function handleProcessAll() {
    setProcessing(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/registrations/trials/process-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xử lý thất bại');
      setConfirmProcess(false);
      setActionMsg(data.message || `Đã duyệt ${data.processed} đơn.`);
      window.dispatchEvent(new Event('registrations:changed'));
      fetchRows();
      fetchPendingCount();
    } catch (err) {
      setActionMsg('Lỗi: ' + err.message);
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
        fetchRows();
        fetchPendingCount();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (session?.user?.role !== 'admin') return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎁 Đăng Ký Học Thử</h1>
          <p className="page-subtitle">Export email học sinh, thêm vào Google Group, rồi duyệt toàn bộ</p>
        </div>
      </div>

      <div className="page-body">
        {/* Action bar */}
        <div className="card" style={{ cursor: 'default', marginBottom: 'var(--space-6)' }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                {pendingCount} đơn cần xử lý
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                1) Export email → 2) Thêm vào Google Group → 3) Bấm &quot;Đã xử lý toàn bộ&quot;
              </div>
            </div>
            <button className="btn btn-outline" onClick={openEmails} disabled={pendingCount === 0}>
              <Mail size={16} /> Xuất email
            </button>
            <button className="btn btn-primary" onClick={() => setConfirmProcess(true)} disabled={pendingCount === 0}>
              <CheckCircle2 size={16} /> Đã xử lý toàn bộ
            </button>
          </div>
          {actionMsg && (
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-herb)', fontWeight: 600 }}>
              {actionMsg}
            </div>
          )}
        </div>

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
            {pagination.total} đơn
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Không có đơn học thử nào trong mục này</div>
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
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{r.fullName}</div>
                        {r.note && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📝 {r.note}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>
                        <div className="flex items-center gap-1" style={{ fontWeight: 600 }}>
                          <Mail size={12} style={{ color: 'var(--color-herb)' }} /> {r.email}
                        </div>
                        <a href={`tel:${r.phone}`} className="flex items-center gap-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          <Phone size={12} /> {r.phone}
                        </a>
                      </td>
                      <td>
                        {r.processed ? (
                          <span className="badge badge-approved"><CheckCircle2 size={12} /> Đã duyệt</span>
                        ) : (
                          <span className="badge badge-pending"><Clock size={12} /> Cần xử lý</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                        {formatDate(r.createdAt)}
                        {r.processed && r.processedAt && (
                          <div style={{ color: 'var(--color-herb)' }}>Duyệt: {formatDate(r.processedAt)}</div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setDeleteTarget(r)}
                          title="Xóa"
                          style={{ color: 'var(--color-coral)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
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

        {/* Emails list modal (copy manually into Google Group) */}
        {emailsOpen && (
          <div className="modal-backdrop" onClick={() => setEmailsOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 className="modal-title">📧 Email học thử cần xử lý</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setEmailsOpen(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                {loadingEmails ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)' }} />
                  </div>
                ) : emailList.length === 0 ? (
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">Không có email cần xử lý</div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        {emailList.length} email — mỗi dòng 1 mail, copy để thêm vào Google Group.
                      </span>
                      <button className="btn btn-outline btn-sm" onClick={copyEmailList}>
                        {copied ? <Check size={14} style={{ color: 'var(--color-herb)' }} /> : <Copy size={14} />}
                        {copied ? 'Đã copy' : 'Copy tất cả'}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      className="form-textarea"
                      value={emailList.join('\n')}
                      onFocus={(e) => e.target.select()}
                      rows={Math.min(14, Math.max(4, emailList.length))}
                      style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', width: '100%' }}
                    />
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setEmailsOpen(false)}>Đóng</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm process-all modal */}
        {confirmProcess && (
          <div className="modal-backdrop" onClick={() => !processing && setConfirmProcess(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <h3 className="modal-title">✅ Duyệt toàn bộ học thử</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setConfirmProcess(false)} disabled={processing}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div style={{ background: 'var(--color-gleam-light)', border: '2px solid var(--border-dark)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <AlertTriangle size={22} style={{ color: 'var(--color-radiate)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    Bạn sắp duyệt <strong>{pendingCount} đơn học thử</strong>. Mỗi học sinh sẽ nhận email thông báo đã được kích hoạt học thử, và các đơn sẽ chuyển sang mục <strong>Đã duyệt</strong>.
                    <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                      Hãy chắc chắn bạn đã thêm các email này vào Google Group trước khi duyệt.
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setConfirmProcess(false)} disabled={processing}>Hủy</button>
                <button className="btn btn-primary" onClick={handleProcessAll} disabled={processing}>
                  {processing ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang duyệt...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Xác nhận duyệt toàn bộ</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {deleteTarget && (
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header" style={{ borderBottomColor: 'var(--color-coral)' }}>
                <h3 className="modal-title">🗑️ Xóa đơn học thử</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  Xóa đơn học thử của <strong>{deleteTarget.fullName}</strong> ({deleteTarget.email})? Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang xóa...</> : <><Trash2 size={16} /> Xóa</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
