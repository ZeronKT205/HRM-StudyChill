'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Coins,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/orders?limit=5'),
        ]);
        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();
        setStats(statsData);
        setRecentOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels = {
    pending: { label: 'Chờ duyệt', class: 'badge-pending', icon: Clock },
    approved: { label: 'Đã duyệt', class: 'badge-approved', icon: CheckCircle2 },
    rejected: { label: 'Từ chối', class: 'badge-rejected', icon: XCircle },
    paid: { label: 'Đã trả hoa hồng', class: 'badge-paid', icon: Coins },
  };

  const isAdmin = session?.user?.role === 'admin';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAdmin ? '👑 Admin Dashboard' : `Xin chào, ${session?.user?.name?.split(' ')[0]} 👋`}
          </h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Quản lý toàn bộ hệ thống CTV'
              : 'Tổng quan đơn hàng và doanh thu của bạn'}
          </p>
        </div>
        <Link href="/dashboard/orders/new" className="btn btn-primary" id="new-order-btn">
          <Plus size={18} />
          Nhập đơn mới
        </Link>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid mb-8">
          <div className="stat-card">
            <div className="stat-icon green">
              <ClipboardList size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tổng đơn hàng</span>
              <span className="stat-value">
                {loading ? '...' : stats?.totalOrders || 0}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tổng doanh thu</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
                {loading ? '...' : formatVND(stats?.totalRevenue || 0)}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon yellow">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Đang chờ duyệt</span>
              <span className="stat-value">
                {loading ? '...' : stats?.pendingOrders || 0}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Đã duyệt</span>
              <span className="stat-value">
                {loading ? '...' : stats?.approvedOrders || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ cursor: 'default' }}>
          <div className="flex items-center justify-between mb-6" style={{ transform: 'none' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              📋 Đơn hàng gần đây
            </h2>
            <Link href="/dashboard/orders" className="btn btn-ghost btn-sm" id="view-all-orders">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Chưa có đơn hàng nào</div>
              <div className="empty-state-text">Bắt đầu nhập đơn hàng đầu tiên của bạn</div>
              <Link href="/dashboard/orders/new" className="btn btn-primary">
                <Plus size={16} /> Nhập đơn mới
              </Link>
            </div>
          ) : (
            <div className="table-container" style={{ boxShadow: 'none', border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Khóa học</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => {
                    const statusInfo = statusLabels[order.status] || statusLabels.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr key={order._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.customerEmail}</div>
                        </td>
                        <td>
                          <div style={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {order.courseDescription}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-herb)' }}>
                          {formatVND(order.orderValue)}
                        </td>
                        <td>
                          <span className={`badge ${statusInfo.class}`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
