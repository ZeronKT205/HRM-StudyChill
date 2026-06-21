'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Mail, Shield, UserCheck, UserX, Loader2, CreditCard, Coins } from 'lucide-react';

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutUser, setPayoutUser] = useState(null);
  const [payoutOrders, setPayoutOrders] = useState([]);
  const [loadingPayoutOrders, setLoadingPayoutOrders] = useState(false);
  const [confirmingPayout, setConfirmingPayout] = useState(false);
  const [approvedCounts, setApprovedCounts] = useState({});

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [session, router]);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
      setApprovedCounts(data.approvedCounts || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId, isActive) {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !isActive }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'ctv' : 'admin';
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleViewPayment(user) {
    setSelectedUser(user);
    setRefreshing(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        const updated = (data.users || []).find(u => u._id === user._id);
        if (updated) {
          setSelectedUser(updated);
        }
      }
    } catch (err) {
      console.error('Error refreshing user details:', err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleOpenPayout(user) {
    setPayoutUser(user);
    setLoadingPayoutOrders(true);
    try {
      const res = await fetch(`/api/orders?status=approved&ctvEmail=${encodeURIComponent(user.email)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setPayoutOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching approved orders:', err);
    } finally {
      setLoadingPayoutOrders(false);
    }
  }

  async function handleConfirmPayout() {
    if (!payoutUser) return;
    setConfirmingPayout(true);
    try {
      const res = await fetch('/api/orders/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctvEmail: payoutUser.email }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Xác nhận đã trả hoa hồng thành công!');
        setPayoutOrders([]);
        fetchUsers();
        setPayoutUser(null);
      } else {
        alert(`Lỗi: ${data.error || 'Không thể thực hiện xác nhận'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setConfirmingPayout(false);
    }
  }

  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';


  if (session?.user?.role !== 'admin') return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Quản Lý CTV</h1>
          <p className="page-subtitle">Xem và quản lý danh sách Cộng Tác Viên</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="card" style={{ cursor: 'default' }}>
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Chưa có CTV nào</div>
              <div className="empty-state-text">CTV sẽ tự động xuất hiện khi họ đăng nhập lần đầu</div>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>CTV</th>
                  <th>Email</th>
                  <th>Vai Trò</th>
                  <th>Trạng Thái</th>
                  <th>Ngày Tham Gia</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              border: '2px solid var(--border-dark)',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--color-linen)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--border-dark)',
                            fontWeight: 700,
                            fontSize: 'var(--text-sm)',
                          }}>
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: 600 }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {user.email}
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-ctv'}`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 CTV'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive !== false ? 'badge-approved' : 'badge-rejected'}`}>
                        {user.isActive !== false ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleViewPayment(user)}
                          title="Thông tin thanh toán"
                          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-navy)' }}
                        >
                          <CreditCard size={14} />
                        </button>
                        {user.role === 'ctv' && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleOpenPayout(user)}
                            title="Đối soát hoa hồng"
                            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-herb)', position: 'relative' }}
                          >
                            <Coins size={14} />
                            {(approvedCounts[user.email] || 0) > 0 && (
                              <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                minWidth: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: 'var(--color-coral)',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                lineHeight: 1,
                                padding: '0 3px',
                              }}>
                                {approvedCounts[user.email]}
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => toggleRole(user._id, user.role)}
                          title={user.role === 'admin' ? 'Chuyển thành CTV' : 'Chuyển thành Admin'}
                          style={{ fontSize: 'var(--text-xs)' }}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          className={`btn btn-sm ${user.isActive !== false ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => toggleUserStatus(user._id, user.isActive !== false)}
                          style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                        >
                          {user.isActive !== false ? (
                            <><UserX size={12} /> Khóa</>
                          ) : (
                            <><UserCheck size={12} /> Mở</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Info Modal */}
        {selectedUser && (
          <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  💳 Thông tin thanh toán
                  {refreshing && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                      (đang tải lại...)
                    </span>
                  )}
                </h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedUser(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 'var(--space-8)' }}>
                  {/* Left Column: CTV & Bank Info */}
                  <div className="flex flex-col gap-6">
                    {/* User Header */}
                    <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '2px solid var(--border-light)' }}>
                      {selectedUser.avatar ? (
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          referrerPolicy="no-referrer"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            border: '2px solid var(--border-dark)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: 'var(--color-linen)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--border-dark)',
                          fontWeight: 700,
                          fontSize: 'var(--text-lg)',
                        }}>
                          {selectedUser.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{selectedUser.name}</h4>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                      </div>
                    </div>

                    {/* Contact Phone */}
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        📞 Số điện thoại: <strong>{selectedUser.phone || 'Chưa cập nhật'}</strong>
                      </span>
                    </div>

                    {/* Neobrutalist Credit Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, var(--color-herb) 0%, var(--color-herb-dark) 100%)',
                      color: 'white',
                      padding: 'var(--space-6)',
                      borderRadius: 'var(--border-radius-lg)',
                      border: '2px solid var(--border-dark)',
                      boxShadow: 'var(--shadow-neo-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-6)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '180px',
                      justifyContent: 'space-between',
                    }}>
                      {/* Card chip & design element */}
                      <div className="flex justify-between items-center">
                        {/* Gold card chip simulation */}
                        <div style={{
                          width: 44,
                          height: 32,
                          background: 'linear-gradient(135deg, #ffd700 0%, var(--color-gleam) 100%)',
                          borderRadius: '6px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          position: 'relative',
                        }}>
                          <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: '30%', right: '30%', borderLeft: '1px solid rgba(0,0,0,0.1)', borderRight: '1px solid rgba(0,0,0,0.1)' }} />
                          <div style={{ position: 'absolute', left: '15%', right: '15%', top: '35%', bottom: '35%', borderTop: '1px solid rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(0,0,0,0.1)' }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.9, fontFamily: 'monospace' }}>
                          STUDYCHILL PAY
                        </span>
                      </div>

                      {/* Card number */}
                      <div style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: '700',
                        letterSpacing: '3px',
                        fontFamily: 'monospace',
                        color: 'var(--color-gleam)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
                      }}>
                        {selectedUser.bankAccountNumber ? selectedUser.bankAccountNumber.match(/.{1,4}/g)?.join(' ') : '•••• •••• •••• ••••'}
                      </div>

                      {/* Card bottom details */}
                      <div className="flex justify-between items-end" style={{ fontFamily: 'var(--font-display)' }}>
                        <div>
                          <span style={{ fontSize: '8px', opacity: 0.7, display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Chủ tài khoản
                          </span>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {selectedUser.bankAccountName || 'CHƯA CẬP NHẬT'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '8px', opacity: 0.7, display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Ngân hàng
                          </span>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', letterSpacing: '0.5px' }}>
                            {selectedUser.bankName || 'CHƯA CẬP NHẬT'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: QR Code Image */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="badge badge-pending mb-4" style={{ fontSize: 'var(--text-xs)', fontWeight: '700' }}>
                      📸 MÃ QR NHẬN TIỀN
                    </span>
                    {selectedUser.qrCodeImage ? (
                      <div style={{
                        background: 'white',
                        padding: 'var(--space-4)',
                        border: '2px solid var(--border-dark)',
                        borderRadius: 'var(--border-radius-lg)',
                        boxShadow: 'var(--shadow-neo-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        maxWidth: '280px',
                        width: '100%',
                      }}>
                        <img
                          src={`/api/images?url=${encodeURIComponent(selectedUser.qrCodeImage)}`}
                          alt="QR Code"
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 'var(--border-radius-sm)',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        background: 'var(--color-linen)',
                        padding: 'var(--space-8)',
                        border: '2px dashed var(--border-medium)',
                        borderRadius: 'var(--border-radius-lg)',
                        width: '100%',
                        maxWidth: '280px',
                        minHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                      }}>
                        <span style={{ fontSize: '40px', marginBottom: '12px' }}>📭</span>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Chưa có mã QR</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                          CTV chưa tải lên ảnh QR thanh toán trong hồ sơ cá nhân
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payout Modal */}
        {payoutUser && (
          <div className="modal-backdrop" onClick={() => setPayoutUser(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 1100 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  💰 Đối soát hoa hồng: {payoutUser.name}
                </h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setPayoutUser(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="grid-2" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 'var(--space-6)' }}>
                  
                  {/* Left Column: Orders list */}
                  <div>
                    <h4 className="mb-4" style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                      Danh sách đơn hàng đã duyệt ({payoutOrders.length} đơn)
                    </h4>
                    {loadingPayoutOrders ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
                        ))}
                      </div>
                    ) : payoutOrders.length === 0 ? (
                      <div className="card text-center" style={{ padding: 'var(--space-8)', cursor: 'default' }}>
                        <span style={{ fontSize: 32 }}>🎉</span>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                          Không có đơn hàng nào chờ trả hoa hồng.
                        </p>
                      </div>
                    ) : (
                      <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table className="table" style={{ fontSize: 'var(--text-xs)' }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                              <th>Khách hàng</th>
                              <th>Khóa học</th>
                              <th>Giá trị</th>
                              <th>Ngày duyệt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payoutOrders.map(order => (
                              <tr key={order._id}>
                                <td style={{ fontWeight: 600 }}>{order.customerEmail}</td>
                                <td>
                                  <div style={{ fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '150px' }} title={order.courseDescription}>
                                    {order.courseDescription}
                                  </div>
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--color-herb)' }}>
                                  {formatVND(order.orderValue)}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>
                                  {new Date(order.updatedAt).toLocaleDateString('vi-VN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Payout Summary & QR */}
                  <div className="flex flex-col gap-4">
                    {/* Revenue Summary Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, var(--color-herb) 0%, var(--color-herb-dark) 100%)',
                      color: 'white',
                      padding: 'var(--space-5)',
                      borderRadius: 'var(--border-radius-lg)',
                      border: '2px solid var(--border-dark)',
                      boxShadow: 'var(--shadow-neo-sm)',
                    }}>
                      <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                        Tổng doanh thu chờ trả
                      </span>
                      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginTop: 'var(--space-2)', color: 'var(--color-gleam)' }}>
                        {formatVND(payoutOrders.reduce((sum, o) => sum + o.orderValue, 0))}
                      </p>
                      <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, marginTop: 'var(--space-1)', display: 'block' }}>
                        {payoutOrders.length} đơn hàng đã duyệt
                      </span>
                    </div>

                    {/* Bank Info + QR Code Row */}
                    <div style={{
                      background: 'white',
                      borderRadius: 'var(--border-radius-lg)',
                      border: '2px solid var(--border-dark)',
                      overflow: 'hidden',
                    }}>
                      {/* Bank Account Info */}
                      <div style={{
                        padding: 'var(--space-4)',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                      }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--border-radius-sm)',
                          background: 'var(--color-gleam-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          border: '1.5px solid var(--color-gleam)',
                          flexShrink: 0,
                        }}>
                          🏦
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {payoutUser.bankAccountName || 'Chưa cập nhật'}
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>
                            {payoutUser.bankName || 'Chưa cập nhật ngân hàng'} • {payoutUser.bankAccountNumber || '---'}
                          </p>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                        <span className="badge badge-pending" style={{ fontSize: 9, fontWeight: 700, marginBottom: 'var(--space-3)', display: 'inline-flex' }}>
                          📸 MÃ QR THANH TOÁN
                        </span>
                        {payoutUser.qrCodeImage ? (
                          <img
                            src={`/api/images?url=${encodeURIComponent(payoutUser.qrCodeImage)}`}
                            alt="QR Code"
                            style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--border-radius-sm)', display: 'block', margin: '0 auto' }}
                          />
                        ) : (
                          <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: 36 }}>📭</span>
                            <p style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>CTV chưa tải lên mã QR thanh toán</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      className="btn btn-primary w-full"
                      disabled={payoutOrders.length === 0 || confirmingPayout}
                      onClick={handleConfirmPayout}
                      style={{ fontSize: 'var(--text-sm)', padding: '12px 14px' }}
                    >
                      {confirmingPayout ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }} />
                          Đang xác nhận...
                        </>
                      ) : (
                        <>💸 Xác nhận đã trả hoa hồng</>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
