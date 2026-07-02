'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  FolderOpen,
  Coins,
  AlertTriangle,
} from 'lucide-react';

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 10,
        status: statusFilter,
      });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Đơn Hàng Của Tôi</h1>
          <p className="page-subtitle">Quản lý và theo dõi tất cả đơn hàng bạn đã nhập</p>
        </div>
        <Link href="/dashboard/orders/new" className="btn btn-primary" id="orders-new-btn">
          <Plus size={18} /> Nhập đơn mới
        </Link>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          {['all', 'pending', 'approved', 'rejected', 'paid'].map(status => (
            <button
              key={status}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setStatusFilter(status);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              id={`filter-${status}`}
            >
              {status === 'all' ? 'Tất cả' : statusConfig[status]?.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {pagination.total} đơn hàng
          </span>
        </div>

        {/* Orders Table */}
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
              <div className="empty-state-text">
                {statusFilter !== 'all'
                  ? 'Không có đơn hàng nào với trạng thái này'
                  : 'Bạn chưa nhập đơn hàng nào. Bắt đầu ngay!'}
              </div>
              <Link href="/dashboard/orders/new" className="btn btn-primary">
                <Plus size={16} /> Nhập đơn mới
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Email Khách Hàng</th>
                    <th>Khóa Học</th>
                    <th>Giá Trị</th>
                    <th>Thư Mục</th>
                    <th>Trạng Thái</th>
                    <th>Ngày Tạo</th>
                    <th>Chi Tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const statusInfo = statusConfig[order.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr key={order._id}>
                        <td style={{ fontWeight: 600 }}>{order.customerEmail}</td>
                        <td>
                          <div style={{
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {order.courseDescription}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-herb)', whiteSpace: 'nowrap' }}>
                          {formatVND(order.orderValue)}
                        </td>
                        <td>
                          <span className="flex items-center gap-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            <FolderOpen size={12} />
                            {order.selectedFolders?.length || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                          {(order.commissionDeducted || order.isError) && (
                            <div className="flex gap-1" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                              {order.commissionDeducted && (
                                <span className="badge badge-deducted"><Coins size={10} /> Đã trừ HH</span>
                              )}
                              {order.isError && (
                                <span className="badge badge-error"><AlertTriangle size={10} /> Báo lỗi</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                          {formatDate(order.createdAt)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Chi tiết đơn hàng</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>CTV</span>
                    <p style={{ fontWeight: 600 }}>{selectedOrder.ctvName}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Email Khách Hàng</span>
                    <p style={{ fontWeight: 600 }}>{selectedOrder.customerEmail}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Khóa Học</span>
                    <p>{selectedOrder.courseDescription}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Giá Trị</span>
                    <p style={{ fontWeight: 800, color: 'var(--color-herb)', fontSize: 'var(--text-xl)' }}>
                      {formatVND(selectedOrder.orderValue)}
                    </p>
                  </div>
                  {(selectedOrder.commissionDeducted || selectedOrder.isError) && (
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {selectedOrder.commissionDeducted && (
                        <span className="badge badge-deducted"><Coins size={12} /> Đã trừ hoa hồng</span>
                      )}
                      {selectedOrder.isError && (
                        <span className="badge badge-error"><AlertTriangle size={12} /> Báo lỗi (0đ)</span>
                      )}
                    </div>
                  )}
                  {selectedOrder.selectedFolders?.length > 0 && (
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Thư Mục Đã Cấp Quyền</span>
                      <div className="selected-folders" style={{ marginTop: 8 }}>
                        {selectedOrder.selectedFolders.map((f, i) => (
                          <span key={i} className="selected-folder-tag">📁 {f.folderName}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedOrder.billImage && (
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Ảnh Bill</span>
                      <img
                        src={`/api/images?url=${encodeURIComponent(selectedOrder.billImage)}`}
                        alt="Bill"
                        style={{ marginTop: 8, maxWidth: '100%', borderRadius: 12, border: '2px solid var(--border-dark)' }}
                      />
                    </div>
                  )}
                  {selectedOrder.adminNote && (
                    <div style={{
                      background: selectedOrder.status === 'rejected' ? '#fff5f5' : 'var(--color-linen)',
                      border: `1.5px solid ${selectedOrder.status === 'rejected' ? '#f5c2c2' : 'var(--border-light)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      padding: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px' }}>{selectedOrder.status === 'rejected' ? '❌' : '📝'}</span>
                        <div>
                          <p style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: selectedOrder.status === 'rejected' ? 'var(--color-coral)' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 4,
                          }}>
                            {selectedOrder.status === 'rejected' ? 'Lý do từ chối' : 'Ghi chú từ Admin'}
                          </p>
                          <p style={{
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            color: selectedOrder.status === 'rejected' ? '#c0392b' : 'var(--text-primary)',
                          }}>
                            {selectedOrder.adminNote}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
