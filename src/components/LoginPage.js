'use client';

import { signIn } from 'next-auth/react';
import { ShieldCheck, BarChart3, FolderOpen, ClipboardList } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '3px solid var(--border-dark)', boxShadow: '3px 3px 0 var(--border-dark)', margin: '0 auto 1.5rem auto' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 className="login-title">Tài Liệu Chill Chill</h1>
        <p className="login-subtitle">
          Hệ thống quản lý đơn hàng cho Cộng Tác Viên
        </p>

        <button
          className="login-btn login-btn-google"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          id="login-google-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.11A6.95 6.95 0 0 1 5.48 12c0-.73.13-1.43.36-2.11V7.05H2.18A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.78z" fill="#FBBC05" />
            <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335" />
          </svg>
          Đăng nhập bằng Google
        </button>

        <div className="login-divider">
          <span>Tính năng</span>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon" style={{ background: '#e8f5e6', color: '#6a8042' }}>
              <ClipboardList size={18} />
            </div>
            <span>Nhập đơn hàng nhanh chóng, chọn môn học & giáo viên dễ dàng</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon" style={{ background: '#e3f0fa', color: '#5b9bd5' }}>
              <FolderOpen size={18} />
            </div>
            <span>Theo dõi trạng thái duyệt đơn hàng theo thời gian thực</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon" style={{ background: '#fef0e0', color: '#ed7a13' }}>
              <BarChart3 size={18} />
            </div>
            <span>Thống kê doanh thu và báo cáo hoa hồng cá nhân trực quan</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon" style={{ background: '#f3e8ff', color: '#8b6cc1' }}>
              <ShieldCheck size={18} />
            </div>
            <span>Đăng nhập an toàn, tiện lợi bằng tài khoản Google</span>
          </div>
        </div>
      </div>
    </div>
  );
}
