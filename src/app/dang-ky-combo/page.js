'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COMBOS, ACCENT_COLORS, formatComboPrice } from '@/lib/combos';
import {
  GraduationCap,
  Check,
  Sparkles,
  Loader2,
  X,
  User,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export default function DangKyComboPage() {
  const router = useRouter();
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', note: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function openRegister(combo) {
    setSelectedCombo(combo);
    setForm({ fullName: '', phone: '', email: '', note: '' });
    setErrors({});
  }

  function closeModal() {
    if (submitting) return;
    setSelectedCombo(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  }

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên';

    const digits = form.phone.replace(/[^\d]/g, '');
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
    else if (digits.length < 9 || digits.length > 12) e.phone = 'Số điện thoại không hợp lệ';

    if (!form.email.trim()) e.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ';

    if (selectedCombo?.requiresNote && !form.note.trim()) {
      e.note = `Vui lòng nhập ${(selectedCombo.noteLabel || 'ghi chú').toLowerCase()}`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, comboId: selectedCombo.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
      // Email received -> go to the QR payment page for this registration.
      router.push(`/dang-ky-combo/thanh-toan/${data.registration.id}`);
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message }));
      setSubmitting(false);
    }
  }

  const noteRequired = !!selectedCombo?.requiresNote;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* ===== HERO ===== */}
      <header
        className="grid-bg"
        style={{
          borderBottom: '3px solid var(--border-dark)',
          padding: 'var(--space-8) var(--space-4) var(--space-10)',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-6)' }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: 40, height: 40, borderRadius: 10, border: '2px solid #000', objectFit: 'cover' }}
            />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.5px' }}>
              STUDYCHILL
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-gleam)',
              color: 'var(--color-moss)',
              border: '2px solid var(--border-dark)',
              boxShadow: 'var(--shadow-neo-sm)',
              borderRadius: 999,
              padding: '6px 16px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <Sparkles size={16} /> Dành riêng cho học sinh 2K9
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 'var(--space-4)' }}>
            ĐĂNG KÍ COMBO 2K9 XPS
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', opacity: 0.92, maxWidth: 560, margin: '0 auto' }}>
            Chọn gói khóa học phù hợp với bạn — đầy đủ môn học, giáo viên và tài liệu luyện thi. Đăng ký chỉ trong 1 phút.
          </p>
        </div>
      </header>

      {/* ===== COMBO GRID ===== */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-10) var(--space-4) var(--space-16)' }}>
        <div className="combo-grid">
          {COMBOS.map((combo) => {
            const accent = ACCENT_COLORS[combo.accent] || ACCENT_COLORS.herb;
            return (
              <div
                key={combo.id}
                className="card combo-card"
                style={{
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  ...(combo.featured ? { borderColor: accent.fg, boxShadow: `6px 6px 0px ${accent.fg}` } : {}),
                }}
              >
                {combo.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      background: accent.fg,
                      color: 'white',
                      border: '2px solid var(--border-dark)',
                      boxShadow: 'var(--shadow-neo-sm)',
                      borderRadius: 999,
                      padding: '4px 14px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ⭐ {combo.badge}
                  </span>
                )}

                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--border-radius-md)',
                    border: '2px solid var(--border-dark)',
                    background: accent.bg,
                    color: accent.fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <GraduationCap size={26} />
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', marginBottom: 4 }}>
                  {combo.name}
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', minHeight: 40 }}>
                  {combo.tagline}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 'var(--space-5)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: accent.fg }}>
                    {formatComboPrice(combo.price)}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>/ khóa</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flex: 1 }}>
                  {combo.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--text-sm)' }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          background: accent.bg,
                          color: accent.fg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`btn ${combo.featured ? 'btn-accent' : 'btn-primary'}`}
                  onClick={() => openRegister(combo)}
                  id={`register-${combo.id}`}
                  style={{ width: '100%' }}
                >
                  Đăng ký ngay
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-10)' }}>
          Cần tư vấn thêm? Hãy để lại thông tin khi đăng ký, đội ngũ StudyChill sẽ liên hệ bạn sớm nhất.
        </p>
      </main>

      {/* ===== REGISTER MODAL ===== */}
      {selectedCombo && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Đăng ký khóa học</h3>
              <button className="btn btn-ghost btn-icon" onClick={closeModal} aria-label="Đóng" disabled={submitting}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Selected combo summary */}
                <div
                  style={{
                    background: 'var(--color-linen)',
                    border: '2px solid var(--border-dark)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--space-4)',
                    marginBottom: 'var(--space-5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Gói đã chọn
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{selectedCombo.name}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', color: 'var(--color-herb)', whiteSpace: 'nowrap' }}>
                    {formatComboPrice(selectedCombo.price)}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="fullName">
                      <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Họ và tên <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      className={`form-input ${errors.fullName ? 'error' : ''}`}
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.fullName && <span className="form-error">{errors.fullName}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="phone">
                      <Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Số điện thoại (Zalo) <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className={`form-input ${errors.phone ? 'error' : ''}`}
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09xxxxxxxx"
                    />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Email <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={`form-input ${errors.email ? 'error' : ''}`}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@gmail.com"
                    />
                    {errors.email ? (
                      <span className="form-error">{errors.email}</span>
                    ) : (
                      <span className="form-helper">Email nhận xác nhận đăng ký — vui lòng nhập chính xác.</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="note">
                      <MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {selectedCombo.noteLabel || 'Ghi chú'}{' '}
                      {noteRequired ? (
                        <span className="required">*</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(không bắt buộc)</span>
                      )}
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      className={`form-textarea ${errors.note ? 'error' : ''}`}
                      value={form.note}
                      onChange={handleChange}
                      placeholder={selectedCombo.notePlaceholder || 'Ghi chú cho tư vấn viên...'}
                      rows={2}
                    />
                    {errors.note && <span className="form-error">{errors.note}</span>}
                  </div>

                  {errors.submit && (
                    <div
                      style={{
                        background: '#fde8e8',
                        border: '2px solid var(--color-coral)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: 'var(--space-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={18} style={{ color: 'var(--color-coral)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#6b1c1c', fontSize: 'var(--text-sm)' }}>{errors.submit}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={submitting}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang xử lý...</>
                  ) : (
                    <>Tiếp tục thanh toán</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .combo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-8) var(--space-6);
        }
        @media (max-width: 640px) {
          .combo-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
