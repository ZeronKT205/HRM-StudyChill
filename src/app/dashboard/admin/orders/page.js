'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertTriangle,
  Search,
  X,
  Eye,
  Calendar,
  RotateCcw,
  ArrowUpDown,
  User,
  Mail,
  FileText,
  Hash,
  ReceiptText,
  Ban,
} from 'lucide-react';

const FLAG_OPTIONS = [
  { value: 'all', label: 'Tất cả loại đơn' },
  { value: 'normal', label: 'Đơn thường' },
  { value: 'deducted', label: 'Đã trừ hoa hồng' },
  { value: 'error', label: 'Báo lỗi' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'value-desc', label: 'Giá trị: cao → thấp' },
  { value: 'value-asc', label: 'Giá trị: thấp → cao' },
];

const DEFAULT_FILTERS = {
  status: 'all',
  flag: 'all',
  from: '',
  to: '',
  sort: 'newest',
  page: 1,
};

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, paid: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [actionOrder, setActionOrder] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);

  // Guards against out-of-order responses when filters change quickly
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Debounce the search box, and snap back to page 1 in the same batch
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setSearch(prev => (prev === next ? prev : next));
      setFilters(prev => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.flag, filters.from, filters.to, filters.sort, search]);

  // Any filter change other than the page itself resets to page 1
  function updateFilter(patch) {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }));
  }

  function goToPage(page) {
    setFilters(prev => ({ ...prev, page }));
  }

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setFilters(DEFAULT_FILTERS);
  }

  const hasActiveFilters = useMemo(() => (
    !!search ||
    filters.status !== 'all' ||
    filters.flag !== 'all' ||
    !!filters.from ||
    !!filters.to ||
    filters.sort !== 'newest'
  ), [search, filters]);

  async function fetchOrders() {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: filters.page,
        limit: 15,
        status: filters.status,
        flag: filters.flag,
        sort: filters.sort,
      });
      if (search) params.set('search', search);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (requestId !== requestIdRef.current) return; // a newer request already won
      setOrders(data.orders || []);
      setCounts(data.counts || { all: 0, pending: 0, approved: 0, rejected: 0, paid: 0 });
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
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
        setDetailOrder(null);
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

  const shareStatusConfig = {
    success: { label: 'Đã cấp quyền', color: '#1a4a18', bg: '#e8f5e6', border: '#a8e6a3' },
    failed: { label: 'Lỗi cấp quyền', color: '#6b1c1c', bg: '#fde8e8', border: '#f5c2c2' },
    pending: { label: 'Chờ cấp quyền', color: '#7a5a00', bg: '#fff8e1', border: '#f0d98c' },
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
        {/* ============ SEARCH + FILTERS ============ */}
        <div className="card mb-6" style={{ cursor: 'default', padding: 'var(--space-5)' }}>
          {/* Search box */}
          <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="form-input w-full"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên CTV, email CTV, email khách hàng, khóa học, ghi chú hoặc mã đơn..."
              style={{ paddingLeft: 42, paddingRight: searchInput ? 42 : 16, width: '100%' }}
              id="admin-orders-search"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                title="Xóa tìm kiếm"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Status pills with live counts */}
          <div className="flex items-center gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            {['all', 'pending', 'approved', 'rejected', 'paid'].map(status => (
              <button
                key={status}
                className={`btn btn-sm ${filters.status === status ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => updateFilter({ status })}
                id={`admin-filter-${status}`}
              >
                {status === 'all' ? 'Tất cả' : statusConfig[status]?.label}
                <span style={{
                  marginLeft: 6,
                  fontSize: 'var(--text-xs)',
                  opacity: 0.75,
                  fontWeight: 700,
                }}>
                  {counts[status] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Advanced filters */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-3)',
            alignItems: 'end',
          }}>
            <div className="form-group">
              <label className="form-label" htmlFor="filter-flag" style={{ fontSize: 'var(--text-xs)' }}>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Loại đơn
              </label>
              <select
                id="filter-flag"
                className="form-input"
                value={filters.flag}
                onChange={e => updateFilter({ flag: e.target.value })}
                style={{ padding: 'var(--space-2) var(--space-3)', paddingRight: 32, fontSize: 'var(--text-sm)' }}
              >
                {FLAG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-from" style={{ fontSize: 'var(--text-xs)' }}>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Từ ngày
              </label>
              <input
                id="filter-from"
                type="date"
                className="form-input"
                value={filters.from}
                max={filters.to || undefined}
                onChange={e => updateFilter({ from: e.target.value })}
                style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-to" style={{ fontSize: 'var(--text-xs)' }}>
                <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Đến ngày
              </label>
              <input
                id="filter-to"
                type="date"
                className="form-input"
                value={filters.to}
                min={filters.from || undefined}
                onChange={e => updateFilter({ to: e.target.value })}
                style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-sort" style={{ fontSize: 'var(--text-xs)' }}>
                <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Sắp xếp
              </label>
              <select
                id="filter-sort"
                className="form-input"
                value={filters.sort}
                onChange={e => updateFilter({ sort: e.target.value })}
                style={{ padding: 'var(--space-2) var(--space-3)', paddingRight: 32, fontSize: 'var(--text-sm)' }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Result summary + reset */}
          <div className="flex items-center gap-3 mt-4" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Tìm thấy <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> đơn hàng
              {search && <> khớp với &quot;<strong>{search}</strong>&quot;</>}
            </span>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ marginLeft: 'auto' }}>
                <RotateCcw size={14} /> Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* ============ TABLE ============ */}
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
                {hasActiveFilters
                  ? 'Không có đơn hàng nào khớp với bộ lọc hiện tại. Thử xóa bớt điều kiện lọc.'
                  : 'Chưa có CTV nào nhập đơn hàng.'}
              </div>
              {hasActiveFilters && (
                <button className="btn btn-outline" onClick={resetFilters}>
                  <RotateCcw size={16} /> Xóa bộ lọc
                </button>
              )}
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
                    <th>Bill</th>
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
                          {order.billImage ? (
                            <span
                              className="flex items-center gap-1"
                              style={{ fontSize: 'var(--text-xs)', color: 'var(--color-herb)', fontWeight: 600 }}
                              title="Đã có ảnh bill"
                            >
                              <ReceiptText size={14} /> Có
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1"
                              style={{ fontSize: 'var(--text-xs)', color: 'var(--color-coral)', fontWeight: 600 }}
                              title="Đơn này chưa có ảnh bill"
                            >
                              <Ban size={14} /> Thiếu
                            </span>
                          )}
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
                          <div className="flex items-center gap-2">
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => setDetailOrder(order)}
                              title="Xem chi tiết đơn hàng"
                              aria-label="Xem chi tiết đơn hàng"
                              style={{ width: 32, height: 32, padding: 4 }}
                            >
                              <Eye size={16} />
                            </button>
                            {order.status === 'pending' && (
                              <>
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
                              </>
                            )}
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
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Tiếp <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ DETAIL MODAL (eye icon) ============ */}
        {detailOrder && (
          <div className="modal-backdrop" onClick={() => setDetailOrder(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h3 className="modal-title">👁️ Chi tiết đơn hàng</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setDetailOrder(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  {/* Status + flags */}
                  <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    {(() => {
                      const info = statusConfig[detailOrder.status] || statusConfig.pending;
                      const Icon = info.icon;
                      return <span className={`badge ${info.class}`}><Icon size={12} /> {info.label}</span>;
                    })()}
                    {detailOrder.commissionDeducted && (
                      <span className="badge badge-deducted"><Coins size={12} /> Đã trừ hoa hồng</span>
                    )}
                    {detailOrder.isError && (
                      <span className="badge badge-error"><AlertTriangle size={12} /> Báo lỗi (0đ)</span>
                    )}
                  </div>

                  {/* Core fields */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--space-4)',
                  }}>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Cộng tác viên
                      </span>
                      <p style={{ fontWeight: 600 }}>{detailOrder.ctvName}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{detailOrder.ctvEmail}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Mail size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Email khách hàng
                      </span>
                      <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{detailOrder.customerEmail}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Ngày nhập đơn
                      </span>
                      <p style={{ fontWeight: 600 }}>{formatDate(detailOrder.createdAt)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Hash size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Mã đơn
                      </span>
                      <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {detailOrder._id}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <FileText size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Khóa học / Sản phẩm
                    </span>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{detailOrder.courseDescription}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Giá trị đơn hàng</span>
                    <p style={{ fontWeight: 800, color: 'var(--color-herb)', fontSize: 'var(--text-xl)' }}>
                      {formatVND(detailOrder.orderValue)}
                    </p>
                  </div>

                  {/* Folders + drive share status */}
                  {detailOrder.selectedFolders?.length > 0 && (
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <FolderOpen size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        Thư mục đã chọn ({detailOrder.selectedFolders.length})
                      </span>
                      <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
                        {detailOrder.selectedFolders.map((f, i) => {
                          const share = (detailOrder.driveShareStatus || []).find(s => s.folderId === f.folderId);
                          const cfg = shareStatusConfig[share?.status] || shareStatusConfig.pending;
                          return (
                            <div
                              key={f.folderId || i}
                              className="flex items-center gap-2"
                              style={{
                                justifyContent: 'space-between',
                                padding: 'var(--space-2) var(--space-3)',
                                border: '1.5px solid var(--border-light)',
                                borderRadius: 'var(--border-radius-md)',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>📁 {f.folderName}</span>
                              <span
                                className="badge"
                                style={{
                                  background: cfg.bg,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.border}`,
                                }}
                                title={share?.error || ''}
                              >
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bill */}
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <ReceiptText size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Ảnh bill / biên lai
                    </span>
                    {detailOrder.billImage ? (
                      <img
                        src={`/api/images?url=${encodeURIComponent(detailOrder.billImage)}`}
                        alt="Bill"
                        style={{
                          marginTop: 8,
                          maxWidth: '100%',
                          borderRadius: 12,
                          border: '2px solid var(--border-dark)',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <p style={{
                        marginTop: 8,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--color-coral)',
                      }}>
                        ⚠️ Đơn này không có ảnh bill
                      </p>
                    )}
                  </div>

                  {/* Admin note */}
                  {detailOrder.adminNote && (
                    <div style={{
                      background: detailOrder.status === 'rejected' ? '#fff5f5' : 'var(--color-linen)',
                      border: `1.5px solid ${detailOrder.status === 'rejected' ? '#f5c2c2' : 'var(--border-light)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      padding: 'var(--space-4)',
                    }}>
                      <p style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: detailOrder.status === 'rejected' ? 'var(--color-coral)' : 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 4,
                      }}>
                        {detailOrder.status === 'rejected' ? 'Lý do từ chối' : 'Ghi chú của Admin'}
                      </p>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{detailOrder.adminNote}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDetailOrder(null)}>Đóng</button>
                {detailOrder.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-danger"
                      onClick={() => { setRejectOrder(detailOrder); setRejectNote(''); setDetailOrder(null); }}
                    >
                      <XCircle size={16} /> Từ chối
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => { setActionOrder(detailOrder); setAdminNote(''); setDetailOrder(null); }}
                    >
                      <CheckCircle2 size={16} /> Duyệt đơn
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ APPROVE MODAL ============ */}
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
                  {actionOrder.isError ? (
                    <div style={{
                      background: '#fde8e8',
                      border: '1.5px solid #f5c2c2',
                      borderRadius: 'var(--border-radius-md)',
                      padding: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                            Đơn báo lỗi (0đ) — không tự động chuyển trạng thái
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            Đơn này sẽ chỉ chuyển sang <strong>&quot;Đã duyệt&quot;</strong>. Bạn cần tự xử lý và đối soát thủ công — hệ thống <strong>không</strong> tự đẩy sang &quot;Đã trả hoa hồng&quot;.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : actionOrder.commissionDeducted ? (
                    <div style={{
                      background: '#e8f5e6',
                      border: '1.5px solid #a8e6a3',
                      borderRadius: 'var(--border-radius-md)',
                      padding: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '20px' }}>💸</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                            Đơn đã trừ hoa hồng
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            Sau khi duyệt và cấp quyền khóa học, đơn này sẽ tự động chuyển sang <strong>&quot;Đã trả hoa hồng&quot;</strong> — không cần đối soát hoa hồng.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
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

        {/* ============ REJECT MODAL ============ */}
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
