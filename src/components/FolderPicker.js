'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, FolderOpen, GraduationCap, User, Loader2, RefreshCw } from 'lucide-react';

export default function FolderPicker({ selectedFolders, onSelectionChange }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded states for UI toggling
  const [expandedRoots, setExpandedRoots] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drive/folders');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load folders');
      setFolders(data.folders || []);
      
      // Auto-expand roots if they have children
      const roots = {};
      (data.folders || []).forEach(f => {
        if ((f.children || []).length > 0) {
          roots[f.id] = true;
        }
      });
      setExpandedRoots(roots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleRoot(rootId) {
    setExpandedRoots(prev => ({ ...prev, [rootId]: !prev[rootId] }));
  }

  function toggleSubject(subjectId) {
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  }

  // Check if a folder is directly selected
  function isDirectlySelected(folderId) {
    return selectedFolders.some(f => f.folderId === folderId);
  }

  function getPath(rootName, subjectName, teacherName) {
    const parts = [rootName];
    if (subjectName) parts.push(subjectName);
    if (teacherName) parts.push(teacherName);
    return parts.join(' > ');
  }

  // Toggle root selection (Level 1)
  function toggleRootSelection(root) {
    const rootSelected = isDirectlySelected(root.id);
    if (rootSelected) {
      onSelectionChange(selectedFolders.filter(f => f.folderId !== root.id));
    } else {
      // Collect all child subject IDs and grandchild teacher IDs of this root
      const subjectIds = (root.children || []).map(s => s.id);
      const teacherIds = (root.children || []).flatMap(s => (s.children || []).map(t => t.id));
      const allChildIds = [...subjectIds, ...teacherIds];
      
      // Clean up children from selection, then select the root itself
      const filtered = selectedFolders.filter(f => !allChildIds.includes(f.folderId));
      onSelectionChange([
        ...filtered,
        {
          folderId: root.id,
          folderName: root.name,
          folderPath: root.name
        }
      ]);
    }
  }

  // Toggle subject selection (Level 2)
  function toggleSubjectSelection(subject, root) {
    const isSubSelected = isDirectlySelected(subject.id);
    if (isSubSelected) {
      onSelectionChange(selectedFolders.filter(f => f.folderId !== subject.id));
    } else {
      // Collect child teacher IDs
      const teacherIds = (subject.children || []).map(t => t.id);
      
      // Clean up child teachers from selection, then select the subject itself
      const filtered = selectedFolders.filter(f => !teacherIds.includes(f.folderId));
      onSelectionChange([
        ...filtered,
        {
          folderId: subject.id,
          folderName: subject.name,
          folderPath: getPath(root.name, subject.name)
        }
      ]);
    }
  }

  // Toggle teacher selection (Level 3)
  function toggleTeacherSelection(teacher, subject, root) {
    const path = getPath(root.name, subject.name, teacher.name);
    if (isDirectlySelected(teacher.id)) {
      onSelectionChange(selectedFolders.filter(f => f.folderId !== teacher.id));
    } else {
      onSelectionChange([...selectedFolders, { folderId: teacher.id, folderName: teacher.name, folderPath: path }]);
    }
  }

  if (loading) {
    return (
      <div className="folder-tree" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <Loader2 size={32} className="spinner-inline" style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-herb)' }} />
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Đang tải danh sách khóa học...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="folder-tree" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-coral)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          ❌ {error}
        </p>
        <button className="btn btn-outline btn-sm" onClick={loadFolders}>
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Tree */}
      <div className="folder-tree">
        {folders.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Chưa có dữ liệu khóa học. Vui lòng liên hệ Admin để thực hiện đồng bộ từ Google Drive.
          </div>
        ) : (
          folders.map(root => (
            <div key={root.id}>
              {/* Root level (Level 1) */}
              <div
                className="folder-root"
                onClick={() => toggleRoot(root.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <input
                  type="checkbox"
                  className="folder-checkbox"
                  checked={isDirectlySelected(root.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleRootSelection(root);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  id={`folder-${root.id}`}
                  style={{ accentColor: 'var(--color-gleam)' }}
                />
                <ChevronRight
                  size={16}
                  className={`folder-toggle ${expandedRoots[root.id] ? 'expanded' : ''}`}
                  style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                />
                <FolderOpen size={18} />
                <span style={{ flex: 1 }}>{root.name}</span>
                {(root.children || []).length > 0 && (
                  <span className="folder-count" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    {(root.children || []).length} môn
                  </span>
                )}
              </div>
 
              {/* Subject level (Level 2) */}
              {expandedRoots[root.id] && (root.children || []).map(subject => (
                <div key={subject.id}>
                  <div className="folder-subject">
                    <input
                      type="checkbox"
                      className="folder-checkbox"
                      checked={isDirectlySelected(subject.id) || isDirectlySelected(root.id)}
                      disabled={isDirectlySelected(root.id)}
                      onChange={() => toggleSubjectSelection(subject, root)}
                      id={`folder-${subject.id}`}
                    />
                    <ChevronRight
                      size={14}
                      className={`folder-toggle ${expandedSubjects[subject.id] ? 'expanded' : ''}`}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                      onClick={(e) => { e.stopPropagation(); toggleSubject(subject.id); }}
                    />
                    <GraduationCap size={16} style={{ color: 'var(--color-herb)' }} />
                    <span onClick={() => toggleSubject(subject.id)} style={{ cursor: 'pointer', flex: 1 }}>
                      {subject.name}
                    </span>
                    {(subject.children || []).length > 0 && (
                      <span className="folder-count">{(subject.children || []).length}</span>
                    )}
                  </div>
 
                  {/* Teacher level (Level 3) */}
                  {expandedSubjects[subject.id] && (subject.children || []).map(teacher => (
                    <div key={teacher.id} className="folder-teacher">
                      <input
                        type="checkbox"
                        className="folder-checkbox"
                        checked={isDirectlySelected(teacher.id) || isDirectlySelected(subject.id) || isDirectlySelected(root.id)}
                        disabled={isDirectlySelected(subject.id) || isDirectlySelected(root.id)}
                        onChange={() => toggleTeacherSelection(teacher, subject, root)}
                        id={`folder-${teacher.id}`}
                      />
                      <User size={14} style={{ color: 'var(--color-radiate)' }} />
                      <span>{teacher.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
 
      {/* Selected folders summary */}
      {selectedFolders.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            Đã chọn {selectedFolders.length} thư mục:
          </div>
          <div className="selected-folders">
            {selectedFolders.map(f => (
              <span key={f.folderId} className="selected-folder-tag">
                📁 {f.folderName}
                <button onClick={() => onSelectionChange(selectedFolders.filter(item => item.folderId !== f.folderId))}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
