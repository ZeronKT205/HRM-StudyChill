'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FolderPicker from '@/components/FolderPicker';
import {
  Zap,
  ZapOff,
  FolderOpen,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Settings2,
} from 'lucide-react';

export default function ComboFoldersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { comboId, comboName, folders, enabled, requiresNote }
  const [editFolders, setEditFolders] = useState([]);
  const [editEnabled, setEditEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchCombos();
  }, []);

  async function fetchCombos() {
    setLoading(true);
    try {
      const res = await fetch('/api/combo-folders');
      const data = await res.json();
      setCombos(data.combos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openEditor(combo) {
    setEditing(combo);
    setEditFolders(combo.folders || []);
    setEditEnabled(combo.enabled);
    setError('');
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/combo-folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comboId: editing.comboId,
          folders: editFolders,
          enabled: editEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không lưu được cấu hình');
      setEditing(null);
      setToast(`Đã lưu cấu hình cho "${editing.comboName}"`);
      setTimeout(() => setToast(''), 4000);
      fetchCombos();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';

  if (session?.user?.role !== 'admin') return null;

  const autoCount = combos.filter(c => c.enabled).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚡ Tự Động Cấp Quyền Khóa Học</h1>
          <p className="page-subtitle">
            Gán thư mục Drive cho từng combo — học viên thanh toán xong là được cấp quyền và nhận link ngay
          </p>
        </div>
      </div>

      <div className="page-body">
        {toast && (
          <div className="card mb-6" style={{ background: '#e8f5e6', cursor: 'default' }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} style={{ color: 'var(--color-herb)' }} />
              <strong>{toast}</strong>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="card mb-6" style={{ cursor: 'default', background: 'var(--color-linen)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <Settings2 size={22} style={{ color: 'var(--color-herb)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Cách hoạt động</p>
              <p style={{ color: 'var(--text-muted)' }}>
                Combo nào <strong>đã bật</strong> và có thư mục: khi SePay báo thanh toán thành công, hệ thống tự cấp
                quyền Drive cho email học viên, gửi email kèm link folder, và tự tạo đơn hàng &quot;Đã trả hoa hồng&quot; —
                Admin không cần duyệt tay nữa.
                <br />
                Combo <strong>chưa bật</strong> vẫn chạy quy trình cũ: học viên chờ Admin vào tick thư mục và duyệt.
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, color: 'var(--color-coral)' }} />
                Các combo <strong>tự chọn môn / giáo viên</strong> (3 môn, 1 môn, lẻ 1 GV...) nên để <strong>tắt</strong>, vì
                mỗi học viên chọn nội dung khác nhau — không thể dùng chung một bộ thư mục cố định.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge-approved"><Zap size={12} /> {autoCount} combo đang tự động</span>
          <span className="badge badge-pending"><ZapOff size={12} /> {combos.length - autoCount} combo duyệt thủ công</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {combos.map(combo => (
              <div key={combo.comboId} className="card" style={{ cursor: 'default' }}>
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
                        {combo.comboName}
                      </strong>
                      {combo.enabled ? (
                        <span className="badge badge-approved"><Zap size={11} /> Tự động</span>
                      ) : (
                        <span className="badge badge-pending"><ZapOff size={11} /> Thủ công</span>
                      )}
                      {combo.requiresNote && (
                        <span className="badge badge-error" title={combo.noteLabel}>
                          <AlertTriangle size={11} /> Học viên tự chọn
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatVND(combo.price)} •{' '}
                      <span style={{ color: combo.folders.length ? 'var(--color-herb)' : 'var(--text-muted)', fontWeight: 600 }}>
                        <FolderOpen size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {combo.folders.length} thư mục đã gán
                      </span>
                    </p>
                    {combo.folders.length > 0 && (
                      <div className="selected-folders" style={{ marginTop: 8 }}>
                        {combo.folders.slice(0, 6).map((f, i) => (
                          <span key={i} className="selected-folder-tag">📁 {f.folderName}</span>
                        ))}
                        {combo.folders.length > 6 && (
                          <span className="selected-folder-tag">+{combo.folders.length - 6} nữa</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-outline" onClick={() => openEditor(combo)}>
                    <Settings2 size={16} /> Cấu hình
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor modal */}
        {editing && (
          <div className="modal-backdrop" onClick={() => !saving && setEditing(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h3 className="modal-title">⚙️ {editing.comboName}</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditing(null)} disabled={saving}>✕</button>
              </div>
              <div className="modal-body">
                <div className="flex flex-col gap-4">
                  {editing.requiresNote && (
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
                            Combo này để học viên tự chọn ({editing.noteLabel})
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            Mỗi học viên chọn môn/giáo viên khác nhau nên không thể dùng chung một bộ thư mục. Chỉ bật tự
                            động nếu bạn chắc chắn mọi học viên mua combo này đều nhận đúng bộ thư mục dưới đây.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-grant toggle */}
                  <label htmlFor="auto-toggle" style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)',
                    cursor: 'pointer',
                    padding: 'var(--space-3)',
                    border: `1.5px solid ${editEnabled ? 'var(--color-herb)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--border-radius-md)',
                    background: editEnabled ? '#e8f5e6' : 'transparent',
                  }}>
                    <input
                      type="checkbox"
                      id="auto-toggle"
                      className="folder-checkbox"
                      checked={editEnabled}
                      onChange={e => setEditEnabled(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={14} /> Tự động cấp quyền ngay khi thanh toán thành công
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                        Tắt = giữ quy trình cũ, Admin vào tick thư mục và duyệt tay.
                      </span>
                    </div>
                  </label>

                  <div>
                    <p className="form-label" style={{ marginBottom: 'var(--space-2)' }}>
                      <FolderOpen size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Thư mục cấp cho combo này
                    </p>
                    <FolderPicker selectedFolders={editFolders} onSelectionChange={setEditFolders} />
                  </div>

                  {error && (
                    <div style={{
                      background: '#fde8e8',
                      border: '2px solid var(--color-coral)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: 'var(--space-3)',
                    }}>
                      <span style={{ fontWeight: 600, color: '#6b1c1c', fontSize: 'var(--text-sm)' }}>
                        <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {error}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Hủy</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang lưu...</>
                  ) : (
                    <><Save size={16} /> Lưu cấu hình</>
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
