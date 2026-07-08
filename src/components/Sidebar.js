'use client';

import { useState, useEffect } from 'react';
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
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === 'admin';
  const [counts, setCounts] = useState({ combo: 0, trial: 0 });

  // Poll how many combo registrations and trials need processing (admin only) so
  // the red badges stay fresh. Also refresh on navigation and on the custom event
  // dispatched right after a registration is approved/deleted.
  useEffect(() => {
    if (!isAdmin) return;

    let alive = true;
    async function fetchPending() {
      try {
        const res = await fetch('/api/registrations/pending-count', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setCounts({ combo: data.combo || 0, trial: data.trial || 0 });
      } catch {
        /* ignore */
      }
    }

    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    const onChanged = () => fetchPending();
    window.addEventListener('registrations:changed', onChanged);

    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('registrations:changed', onChanged);
    };
  }, [isAdmin, pathname]);

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
        { href: '/dashboard/admin/registrations', icon: GraduationCap, label: 'Đăng ký khóa học', badge: 'registrations' },
        { href: '/dashboard/admin/trials', icon: Sparkles, label: 'Học thử', badge: 'trials' },
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
                const badgeCount =
                  item.badge === 'registrations' ? counts.combo : item.badge === 'trials' ? counts.trial : 0;
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
                    {badgeCount > 0 && (
                      <span
                        title={`${badgeCount} đơn cần xử lý`}
                        style={{
                          marginLeft: 'auto',
                          background: '#e53935',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-display)',
                          minWidth: 20,
                          height: 20,
                          padding: '0 6px',
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          boxShadow: '0 0 0 2px rgba(229,57,53,0.25)',
                        }}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight size={14} style={{ marginLeft: badgeCount > 0 ? 6 : 'auto', opacity: 0.5 }} />
                    )}
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
