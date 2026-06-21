'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen,
  Loader2,
  MessageSquare,
  Coins,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionOrder, setActionOrder] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 15,
        status: statusFilter,
      });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, status) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      if (res.ok) {
        setActionOrder(null);
        setAdminNote('');
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusConfig = {
    pending: { label: 'Chờ duyệt', class: 'badge-pending', icon: Clock },
    approved: { label: 'Đã duyệt', class: 'badge-approved', icon: CheckCircle2 },
    rejected: { label: 'Từ chối', class: 'badge-rejected', icon: XCircle },
    paid: { label: 'Đã trả hoa hồng', class: 'badge-paid', icon: Coins },
  };

  if (session?.user?.role !== 'admin') return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Tất Cả Đơn Hàng</h1>
          <p className="page-subtitle">Xem và duyệt đơn hàng từ tất cả CTV</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          {['all', 'pending', 'approved', 'rejected', 'paid'].map(status => (
            <button
              key={status}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setStatusFilter(status); setPagination(prev => ({ ...prev, page: 1 })); }}
            >
              {status === 'all' ? 'Tất cả' : statusConfig[status]?.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {pagination.total} đơn hàng
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Không có đơn hàng nào</div>
            </div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>CTV</th>
                    <th>Khách Hàng</th>
                    <th>Khóa Học</th>
                    <th>Giá Trị</th>
                    <th>Thư Mục</th>
                    <th>Trạng Thái</th>
                    <th>Ngày</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const statusInfo = statusConfig[order.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr key={order._id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{order.ctvName}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{order.ctvEmail}</div>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{order.customerEmail}</td>
                        <td>
                          <div style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                            {order.courseDescription}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-herb)', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                          {formatVND(order.orderValue)}
                        </td>
                        <td>
                          <span className="flex items-center gap-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            <FolderOpen size={12} /> {order.selectedFolders?.length || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>
                            <StatusIcon size={12} /> {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                          {formatDate(order.createdAt)}
                        </td>
                        <td>
                          {order.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => { setActionOrder(order); setAdminNote(''); }}
                                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                              >
                                Duyệt
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => { setRejectOrder(order); setRejectNote(''); }}
                                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>
                          )}
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
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Tiếp <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Approve Modal */}
        {actionOrder && (
          <div className="modal-backdrop" onClick={() => setActionOrder(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">✅ Duyệt đơn hàng</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setActionOrder(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>CTV</span>
                    <p style={{ fontWeight: 600 }}>{actionOrder.ctvName} ({actionOrder.ctvEmail})</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Khách hàng</span>
                    <p style={{ fontWeight: 600 }}>{actionOrder.customerEmail}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Giá trị</span>
                    <p style={{ fontWeight: 800, color: 'var(--color-herb)', fontSize: 'var(--text-xl)' }}>
                      {formatVND(actionOrder.orderValue)}
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      className="form-textarea"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Thêm ghi chú cho đơn hàng này..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setActionOrder(null)}>Hủy</button>
                <button
                  className="btn btn-primary"
                  onClick={() => updateOrderStatus(actionOrder._id, 'approved')}
                  disabled={processing}
                >
                  {processing ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang xử lý...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Xác nhận duyệt</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectOrder && (
          <div className="modal-backdrop" onClick={() => setRejectOrder(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ borderBottomColor: 'var(--color-coral)' }}>
                <h3 className="modal-title">❌ Từ chối đơn hàng</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setRejectOrder(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  <div style={{
                    background: '#fff5f5',
                    border: '1.5px solid #f5c2c2',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--space-4)',
                  }}>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '24px' }}>⚠️</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 4 }}>Bạn sắp từ chối đơn hàng này</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          CTV: <strong>{rejectOrder.ctvName}</strong> • Khách: <strong>{rejectOrder.customerEmail}</strong>
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-herb)', marginTop: 4 }}>
                          {formatVND(rejectOrder.orderValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Lý do từ chối (tùy chọn)
                    </label>
                    <textarea
                      className="form-textarea"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Nhập lý do từ chối để CTV biết, ví dụ: Bill không hợp lệ, sai thông tin..."
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setRejectOrder(null)}>Hủy</button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    setProcessing(true);
                    try {
                      const res = await fetch(`/api/orders/${rejectOrder._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'rejected', adminNote: rejectNote }),
                      });
                      if (res.ok) {
                        setRejectOrder(null);
                        setRejectNote('');
                        fetchOrders();
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                >
                  {processing ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang xử lý...</>
                  ) : (
                    <><XCircle size={16} /> Xác nhận từ chối</>
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
