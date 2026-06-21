'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  ClipboardList,
  Users,
  TrendingUp,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Database,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    async function fetchData() {
      try {
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        const foldersRes = await fetch('/api/drive/folders');
        const foldersData = await foldersRes.json();
        if (foldersData.lastSyncedAt) {
          setLastSyncedAt(foldersData.lastSyncedAt);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session, router]);

  async function handleSync() {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      
      setLastSyncedAt(data.lastSyncedAt);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 5000);
    } catch (err) {
      alert('Đồng bộ thất bại: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Chưa đồng bộ lần nào';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  };

  if (session?.user?.role !== 'admin') return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">👑 Admin Panel</h1>
          <p className="page-subtitle">Quản trị toàn bộ hệ thống Tài Liệu Chill Chill</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid mb-8">
          <div className="stat-card">
            <div className="stat-icon green"><DollarSign size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Tổng Doanh Thu</span>
              <span className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
                {loading ? '...' : formatVND(stats?.totalRevenue || 0)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><ClipboardList size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Tổng Đơn Hàng</span>
              <span className="stat-value">{loading ? '...' : stats?.totalOrders || 0}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><TrendingUp size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Đang Chờ Duyệt</span>
              <span className="stat-value">{loading ? '...' : stats?.pendingOrders || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid-2 mb-8">
          <Link href="/dashboard/admin/orders" className="card" style={{ textDecoration: 'none' }} id="admin-all-orders">
            <div className="flex items-center gap-4">
              <div style={{
                width: 56,
                height: 56,
                background: 'var(--color-herb)',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--border-dark)',
              }}>
                <ClipboardList size={28} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  Tất Cả Đơn Hàng
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Xem, duyệt, từ chối đơn hàng từ tất cả CTV
                </p>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
          </Link>

          <Link href="/dashboard/admin/users" className="card" style={{ textDecoration: 'none' }} id="admin-users">
            <div className="flex items-center gap-4">
              <div style={{
                width: 56,
                height: 56,
                background: 'var(--color-radiate)',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--border-dark)',
              }}>
                <Users size={28} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  Quản Lý CTV
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  Xem danh sách, quản lý quyền truy cập CTV
                </p>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
          </Link>
        </div>

        {/* Sync Course Card */}
        <div className="card" style={{ cursor: 'default' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div style={{
                width: 56,
                height: 56,
                background: 'var(--color-violet)',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--border-dark)',
              }}>
                <Database size={28} style={{ color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  Đồng Bộ Dữ Liệu Khóa Học
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
                  Tải toàn bộ cấu trúc thư mục khóa học từ Google Drive lưu vào Database cho CTV sử dụng.
                </p>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-herb)', fontWeight: 600, display: 'block', marginTop: 6 }}>
                  Lần đồng bộ gần nhất: {loading ? 'Đang tải...' : formatDateTime(lastSyncedAt)}
                </span>
              </div>
            </div>

            <div>
              <button
                className={`btn ${syncSuccess ? 'btn-primary' : 'btn-accent'}`}
                onClick={handleSync}
                disabled={syncing}
                style={{ minWidth: 160 }}
              >
                {syncing ? (
                  <>
                    <Loader2 size={16} className="spinner-inline" style={{ animation: 'spin 0.8s linear infinite' }} />
                    Đang đồng bộ...
                  </>
                ) : syncSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    Đã đồng bộ xong!
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Đồng bộ ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
