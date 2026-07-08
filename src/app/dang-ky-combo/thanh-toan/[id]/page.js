'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatComboPrice } from '@/lib/combos';
import {
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Landmark,
  Hash,
  Banknote,
  ShieldCheck,
} from 'lucide-react';

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-icon"
      title="Sao chép"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check size={16} style={{ color: 'var(--color-herb)' }} /> : <Copy size={16} />}
    </button>
  );
}

export default function ThanhToanPage() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(null); // ms left

  const esRef = useRef(null);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const cleanupWatchers = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const markPaid = useCallback(() => {
    setPaid(true);
    setExpired(false);
    cleanupWatchers();
  }, [cleanupWatchers]);

  // Initial fetch of public payment info.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/registrations/${id}/public`);
        if (!res.ok) {
          if (alive) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setInfo(data);
        if (data.paymentStatus === 'paid') {
          setPaid(true);
        } else {
          const exp = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 4 * 60 * 1000;
          const left = exp - Date.now();
          setRemaining(left > 0 ? left : 0);
          if (left <= 0) setExpired(true);
        }
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Realtime (SSE) + polling fallback while waiting for payment.
  useEffect(() => {
    if (!info || paid || expired) return;

    // SSE gives an instant push but relies on the webhook + stream sharing one
    // process — true on a single VPS, NOT on Vercel serverless (cross-instance).
    // So it's opt-in via NEXT_PUBLIC_ENABLE_SSE; polling below is the reliable path.
    if (process.env.NEXT_PUBLIC_ENABLE_SSE === 'true') {
      try {
        const es = new EventSource(`/api/registrations/${id}/stream`);
        esRef.current = es;
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'paid') markPaid();
          } catch { /* ignore */ }
        };
        es.onerror = () => { /* keep polling fallback; browser auto-reconnects */ };
      } catch { /* EventSource unsupported */ }
    }

    // Polling (primary): checks payment status every 4s. Works on any host.
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/registrations/${id}/public`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.paymentStatus === 'paid') markPaid();
      } catch { /* ignore */ }
    }, 4000);

    return cleanupWatchers;
  }, [info, paid, expired, id, markPaid, cleanupWatchers]);

  // Countdown ticker.
  useEffect(() => {
    if (remaining == null || paid) return;
    tickRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return prev;
        const next = prev - 1000;
        if (next <= 0) {
          setExpired(true);
          clearInterval(tickRef.current);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [remaining != null, paid]); // eslint-disable-line react-hooks/exhaustive-deps

  // When countdown expires, stop watchers (unless already paid).
  useEffect(() => {
    if (expired && !paid) cleanupWatchers();
  }, [expired, paid, cleanupWatchers]);

  const mmss = (() => {
    if (remaining == null) return '--:--';
    const total = Math.max(0, Math.floor(remaining / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  })();

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <header
        className="grid-bg"
        style={{ borderBottom: '3px solid var(--border-dark)', padding: 'var(--space-6) var(--space-4)', textAlign: 'center', color: 'white' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, borderRadius: 9, border: '2px solid #000', objectFit: 'cover' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.5px' }}>STUDYCHILL</span>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
        {children}
      </main>
    </div>
  );

  if (loading) {
    return shell(
      <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 'var(--space-10)' }}>
        <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)' }} />
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)' }}>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  if (notFound) {
    return shell(
      <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 'var(--space-10)' }}>
        <div className="empty-state-icon">🔍</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Không tìm thấy đơn đăng ký</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>Liên kết có thể đã hết hạn hoặc không đúng.</p>
        <Link href="/dang-ky-combo" className="btn btn-primary"><ArrowLeft size={16} /> Quay lại chọn combo</Link>
      </div>
    );
  }

  // ===== PAID =====
  if (paid) {
    return shell(
      <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ width: 84, height: 84, borderRadius: 999, background: '#e8f5e6', border: '2px solid var(--border-dark)', boxShadow: 'var(--shadow-neo-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-herb)' }}>
            <CheckCircle2 size={48} />
          </div>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
          Đã đăng ký thành công! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Cảm ơn bạn đã đăng ký <strong>{info?.comboName}</strong>. Chúng tôi đã nhận được thanh toán của bạn.
        </p>
        <div style={{ background: 'var(--color-gleam-light)', border: '2px solid var(--border-dark)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', textAlign: 'left' }}>
          <ShieldCheck size={22} style={{ color: 'var(--color-radiate)', flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 'var(--text-sm)' }}>
            Vui lòng chờ team duyệt và cấp quyền vào khóa học trong tối đa <strong>1 giờ</strong>. Email xác nhận đã được gửi tới hòm thư của bạn.
          </span>
        </div>
        <Link href="/dang-ky-combo" className="btn btn-outline" style={{ marginTop: 'var(--space-6)' }}>
          <ArrowLeft size={16} /> Về trang combo
        </Link>
      </div>
    );
  }

  // ===== EXPIRED =====
  if (expired) {
    return shell(
      <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
        <div className="empty-state-icon">⏰</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Phiên thanh toán đã hết hạn</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          Nếu bạn đã chuyển khoản, hệ thống vẫn sẽ ghi nhận và team sẽ liên hệ bạn. Nếu chưa, vui lòng đăng ký lại.
        </p>
        <Link href="/dang-ky-combo" className="btn btn-primary"><ArrowLeft size={16} /> Đăng ký lại</Link>
      </div>
    );
  }

  // ===== PENDING (QR + countdown + waiting) =====
  return shell(
    <>
      <div className="card" style={{ cursor: 'default' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', marginBottom: 4 }}>
            Quét mã QR để thanh toán
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{info?.comboName}</p>
        </div>

        {/* Countdown */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--color-gleam-light)', border: '2px solid var(--border-dark)',
            borderRadius: 999, padding: '8px 16px', width: 'fit-content', margin: '0 auto var(--space-5)',
            fontFamily: 'var(--font-display)', fontWeight: 800,
          }}
        >
          <Clock size={18} style={{ color: 'var(--color-radiate)' }} />
          <span>Còn lại {mmss}</span>
        </div>

        {/* QR image */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-5)' }}>
          <div style={{ border: '3px solid var(--border-dark)', borderRadius: 'var(--border-radius-lg)', padding: 8, background: 'white', boxShadow: 'var(--shadow-neo)' }}>
            {info?.qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.qrUrl} alt="Mã QR thanh toán" width={260} height={260} style={{ display: 'block', width: 260, height: 'auto' }} />
            ) : (
              <div style={{ width: 260, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Không tải được QR</div>
            )}
          </div>
        </div>

        {/* Transfer details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <DetailRow icon={<Banknote size={16} />} label="Số tiền">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-herb)' }}>
              {info ? formatComboPrice(info.amount) : ''}
            </span>
            <CopyButton value={info?.amount} />
          </DetailRow>
          <DetailRow icon={<Hash size={16} />} label="Nội dung CK">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.3px' }}>{info?.desCode}</span>
            <CopyButton value={info?.desCode} />
          </DetailRow>
        </div>

        <div style={{ marginTop: 'var(--space-4)', background: 'var(--color-linen)', border: '1.5px solid var(--border-light)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Landmark size={18} style={{ color: 'var(--color-herb)', flexShrink: 0, marginTop: 1 }} />
            <span>
              Quét QR bằng app ngân hàng bất kỳ — số tiền và nội dung chuyển khoản đã được điền sẵn.
              <strong> Vui lòng giữ nguyên nội dung chuyển khoản</strong> để hệ thống tự động xác nhận.
            </span>
          </div>
        </div>
      </div>

      {/* Waiting indicator */}
      <div className="card" style={{ cursor: 'default', marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-herb)' }} />
        <span style={{ fontWeight: 600 }}>Đang chờ xác nhận thanh toán tự động...</span>
      </div>
    </>
  );
}

function DetailRow({ icon, label, children }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        border: '2px solid var(--border-dark)', borderRadius: 'var(--border-radius-md)', padding: '10px 14px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
        {icon} {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</span>
    </div>
  );
}
