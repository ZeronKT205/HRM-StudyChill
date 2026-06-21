'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  TrendingUp,
  ClipboardList,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function StatsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';

  const COLORS = ['#e6a817', '#3da636', '#d94444', '#2b8fc7'];

  const pieData = stats ? [
    { name: 'Chờ duyệt', value: stats.pendingOrders, color: '#e6a817' },
    { name: 'Đã duyệt', value: stats.approvedOrders, color: '#3da636' },
    { name: 'Từ chối', value: stats.rejectedOrders, color: '#d94444' },
    { name: 'Đã trả hoa hồng', value: stats.paidOrders || 0, color: '#2b8fc7' },
  ].filter(d => d.value > 0) : [];

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '8px' }}>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.color, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2a3114' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          border: '2px solid var(--border-dark)',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: 'var(--shadow-neo-sm)',
        }}>
          <p style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, fontSize: '0.875rem' }}>
              {p.name}: {p.name === 'Doanh thu' ? formatVND(p.value) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Thống Kê {isAdmin ? 'Hệ Thống' : 'Doanh Thu'}</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Tổng quan doanh thu và hiệu suất toàn hệ thống' : 'Theo dõi doanh thu và đơn hàng của bạn'}
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Summary Stats */}
        <div className="stats-grid mb-8">
          <div className="stat-card">
            <div className="stat-icon green">
              <DollarSign size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tổng Doanh Thu</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
                {loading ? '...' : formatVND(stats?.totalRevenue || 0)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <ClipboardList size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tổng Đơn Hàng</span>
              <span className="stat-value">{loading ? '...' : stats?.totalOrders || 0}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Trung Bình / Đơn</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
                {loading ? '...' : stats?.totalOrders
                  ? formatVND(Math.round((stats?.totalRevenue || 0) / stats.totalOrders))
                  : '0 ₫'}
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2 mb-8">
          {/* Revenue Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">
                <BarChart3 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                Doanh Thu Theo Tháng
              </h3>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : stats?.monthlyData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4ceb8" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fontWeight: 600, fill: '#2a3114' }} stroke="#8a9170" />
                  <YAxis tick={{ fontSize: 13, fontWeight: 600, fill: '#2a3114' }} stroke="#8a9170" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="#6a8042"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">📈</div>
                <div className="empty-state-text">Chưa có dữ liệu</div>
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Phân Bổ Trạng Thái</h3>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="#2a3114"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon">🎯</div>
                <div className="empty-state-text">Chưa có dữ liệu</div>
              </div>
            )}
          </div>
        </div>

        {/* Top CTVs (Admin only) */}
        {isAdmin && stats?.topCTVs?.length > 0 && (
          <div className="card" style={{ cursor: 'default' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
              marginBottom: 'var(--space-6)',
            }}>
              🏆 Top CTV Doanh Thu Cao Nhất
            </h3>
            <div className="table-container" style={{ boxShadow: 'none', border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>CTV</th>
                    <th>Email</th>
                    <th>Số Đơn</th>
                    <th>Tổng Doanh Thu</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCTVs.map((ctv, i) => (
                    <tr key={ctv._id}>
                      <td>
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: i === 0 ? '#ffe787' : i === 1 ? '#e8e8e8' : i === 2 ? '#ffd4a8' : 'var(--color-linen)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 'var(--text-xs)',
                          border: '2px solid var(--border-dark)',
                        }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{ctv.ctvName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{ctv._id}</td>
                      <td>{ctv.orderCount}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-herb)' }}>
                        {formatVND(ctv.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
