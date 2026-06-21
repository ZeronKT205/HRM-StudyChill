'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardPlus,
  ClipboardList,
  BarChart3,
  User,
  Shield,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'admin';

  const navItems = [
    {
      section: 'Menu chính',
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
        { href: '/dashboard/orders/new', icon: ClipboardPlus, label: 'Nhập đơn mới' },
        { href: '/dashboard/orders', icon: ClipboardList, label: 'Đơn hàng của tôi' },
        { href: '/dashboard/stats', icon: BarChart3, label: 'Thống kê' },
        { href: '/dashboard/profile', icon: User, label: 'Hồ sơ' },
      ],
    },
  ];

  if (isAdmin) {
    navItems.push({
      section: 'Quản trị',
      items: [
        { href: '/dashboard/admin', icon: Shield, label: 'Admin Panel' },
        { href: '/dashboard/admin/orders', icon: ClipboardList, label: 'Tất cả đơn hàng' },
        { href: '/dashboard/admin/users', icon: Users, label: 'Quản lý CTV' },
      ],
    });
  }

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 39,
            display: 'none',
          }}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '2px solid #000', objectFit: 'cover' }} />
          <span className="sidebar-logo-text" style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.5px' }}>STUDYCHILL</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                    id={`nav-${item.href.replace(/\//g, '-')}`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="sidebar-avatar"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <div className="sidebar-user-name">{session?.user?.name || 'User'}</div>
              <div className="sidebar-user-role">
                {isAdmin ? '👑 Admin' : '👤 CTV'}
              </div>
            </div>
          </div>
          <button
            className="sidebar-link"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{ marginTop: '8px', width: '100%', color: 'rgba(255,180,180,0.8)' }}
            id="logout-btn"
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        @media (max-width: 1024px) {
          .sidebar-overlay {
            display: ${isOpen ? 'block' : 'none'} !important;
          }
        }
      `}</style>
    </>
  );
}
