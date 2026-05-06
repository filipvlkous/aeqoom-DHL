import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, FlaskConical } from 'lucide-react';
import useTcpStore from '../useTcpStore';

interface RegexTestModal {
  open: boolean;
  pattern: string;
  maskId: string;
}

interface BarcodeMask {
  id: string;
  barcode_type: string;
  barcode_mask: string;
  descr: string | null;
}

type MaskForm = Omit<BarcodeMask, 'id'>;

const EMPTY_FORM: MaskForm = {
  barcode_type: '',
  barcode_mask: '',
  descr: '',
};

const MaskManagerView: React.FC = () => {
  const reloadMasks = useTcpStore((s) => s.reloadMasks);
  const [masks, setMasks] = useState<BarcodeMask[]>([]);
  const [form, setForm] = useState<MaskForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MaskForm>(EMPTY_FORM);
  const [regexModal, setRegexModal] = useState<RegexTestModal>({
    open: false,
    pattern: '',
    maskId: '',
  });
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);

  const load = async () => {
    const data = await window.dbAPI.getBarcodeMasks();
    setMasks(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!form.barcode_type || !form.barcode_mask) return;
    await window.dbAPI.addBarcodeMask({
      id: crypto.randomUUID(),
      barcode_type: form.barcode_type,
      barcode_mask: form.barcode_mask,
      descr: form.descr || null,
    });
    setForm(EMPTY_FORM);
    await load();
    await reloadMasks();
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.barcode_type || !editForm.barcode_mask) return;
    await window.dbAPI.addBarcodeMask({
      id,
      barcode_type: editForm.barcode_type,
      barcode_mask: editForm.barcode_mask,
      descr: editForm.descr || null,
    });
    setEditingId(null);
    await load();
    await reloadMasks();
  };

  const handleRemove = async (id: string) => {
    await window.dbAPI.removeBarcodeMask(id);
    await load();
    await reloadMasks();
  };

  const startEdit = (mask: BarcodeMask) => {
    setEditingId(mask.id);
    setEditForm({
      barcode_type: mask.barcode_type,
      barcode_mask: mask.barcode_mask,
      descr: mask.descr ?? '',
    });
  };

  const cancelEdit = () => setEditingId(null);

  const openRegexTest = (mask: BarcodeMask) => {
    setRegexModal({ open: true, pattern: mask.barcode_mask, maskId: mask.id });
    setTestInput('');
    setTestResult(null);
  };

  const closeRegexTest = () => {
    setRegexModal({ open: false, pattern: '', maskId: '' });
    setTestInput('');
    setTestResult(null);
  };

  const handleTestRegex = () => {
    try {
      const regex = new RegExp(regexModal.pattern);
      const matches = regex.test(testInput);
      setTestResult({ valid: matches });
    } catch (err: any) {
      setTestResult({ valid: false, error: err.message });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const smallInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 4,
  };

  const btnBase: React.CSSProperties = {
    cursor: 'pointer',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 500,
  };

  const iconBtnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div style={{ paddingTop: 20, width: '100%' }}>
      {/* Add form */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0' }}>
          Add Barcode Mask
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Barcode Type</label>
            <select
              value={form.barcode_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode_type: e.target.value }))
              }
              style={inputStyle}
            >
              <option value="">Select type…</option>
              <option value="EAN">EAN</option>
              <option value="LPN">LPN</option>
              <option value="SN">SN</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Barcode Mask</label>
            <input
              type="text"
              value={form.barcode_mask}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode_mask: e.target.value }))
              }
              placeholder="e.g. ^[0-9]{13}$"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={form.descr ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, descr: e.target.value }))
              }
              placeholder="Optional description"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button
              onClick={() => {
                if (!form.barcode_mask) return;
                setRegexModal({
                  open: true,
                  pattern: form.barcode_mask,
                  maskId: '',
                });
                setTestInput('');
                setTestResult(null);
              }}
              disabled={!form.barcode_mask}
              style={{
                ...btnBase,
                background:
                  hoveredEl === 'test-add' && form.barcode_mask
                    ? '#7e22ce'
                    : '#a855f7',
                color: '#fff',
                opacity: !form.barcode_mask ? 0.5 : 1,
                cursor: !form.barcode_mask ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={() => setHoveredEl('test-add')}
              onMouseLeave={() => setHoveredEl(null)}
            >
              <FlaskConical style={{ width: 16, height: 16 }} />
              Test
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.barcode_type || !form.barcode_mask}
              style={{
                ...btnBase,
                background:
                  hoveredEl === 'add' && form.barcode_type && form.barcode_mask
                    ? '#1d4ed8'
                    : '#3b82f6',
                color: '#fff',
                opacity: !form.barcode_type || !form.barcode_mask ? 0.5 : 1,
                cursor:
                  !form.barcode_type || !form.barcode_mask
                    ? 'not-allowed'
                    : 'pointer',
              }}
              onMouseEnter={() => setHoveredEl('add')}
              onMouseLeave={() => setHoveredEl(null)}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0' }}>
          Barcode Masks{' '}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>
            ({masks.length})
          </span>
        </h2>

        {masks.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: '#6b7280',
              padding: '32px 0',
              margin: 0,
            }}
          >
            No masks defined yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                fontSize: 14,
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    textAlign: 'left',
                    color: '#4b5563',
                  }}
                >
                  <th
                    style={{
                      paddingBottom: 8,
                      paddingRight: 16,
                      fontWeight: 500,
                    }}
                  >
                    Barcode Type
                  </th>
                  <th
                    style={{
                      paddingBottom: 8,
                      paddingRight: 16,
                      fontWeight: 500,
                    }}
                  >
                    Mask
                  </th>
                  <th
                    style={{
                      paddingBottom: 8,
                      paddingRight: 16,
                      fontWeight: 500,
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      paddingBottom: 8,
                      fontWeight: 500,
                      textAlign: 'right',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {masks.map((mask, idx) => (
                  <tr
                    key={mask.id}
                    style={{
                      borderBottom:
                        idx < masks.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                  >
                    {editingId === mask.id ? (
                      <>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                          }}
                        >
                          <select
                            value={editForm.barcode_type}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                barcode_type: e.target.value,
                              }))
                            }
                            style={smallInputStyle}
                          >
                            <option value="">Select type…</option>
                            <option value="EAN">EAN</option>
                            <option value="LPN">LPN</option>
                            <option value="SN">SN</option>
                          </select>
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                          }}
                        >
                          <input
                            type="text"
                            value={editForm.barcode_mask}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                barcode_mask: e.target.value,
                              }))
                            }
                            style={smallInputStyle}
                          />
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                          }}
                        >
                          <input
                            type="text"
                            value={editForm.descr ?? ''}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                descr: e.target.value,
                              }))
                            }
                            style={smallInputStyle}
                          />
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            textAlign: 'right',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 8,
                            }}
                          >
                            <button
                              onClick={() => handleSaveEdit(mask.id)}
                              disabled={
                                !editForm.barcode_type || !editForm.barcode_mask
                              }
                              title="Save"
                              style={{
                                ...iconBtnBase,
                                color:
                                  hoveredEl === `save-${mask.id}`
                                    ? '#15803d'
                                    : '#16a34a',
                                opacity:
                                  !editForm.barcode_type ||
                                  !editForm.barcode_mask
                                    ? 0.4
                                    : 1,
                                cursor:
                                  !editForm.barcode_type ||
                                  !editForm.barcode_mask
                                    ? 'not-allowed'
                                    : 'pointer',
                              }}
                              onMouseEnter={() =>
                                setHoveredEl(`save-${mask.id}`)
                              }
                              onMouseLeave={() => setHoveredEl(null)}
                            >
                              <Check style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              title="Cancel"
                              style={{
                                ...iconBtnBase,
                                color:
                                  hoveredEl === `cancel-${mask.id}`
                                    ? '#374151'
                                    : '#6b7280',
                              }}
                              onMouseEnter={() =>
                                setHoveredEl(`cancel-${mask.id}`)
                              }
                              onMouseLeave={() => setHoveredEl(null)}
                            >
                              <X style={{ width: 16, height: 16 }} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                            fontWeight: 500,
                          }}
                        >
                          {mask.barcode_type}
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                          }}
                        >
                          <code
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              background: '#f9fafb',
                              borderRadius: 4,
                              padding: '2px 6px',
                            }}
                          >
                            {mask.barcode_mask}
                          </code>
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            paddingRight: 16,
                            color: '#6b7280',
                          }}
                        >
                          {mask.descr ?? (
                            <span
                              style={{ fontStyle: 'italic', color: '#d1d5db' }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            paddingTop: 8,
                            paddingBottom: 8,
                            textAlign: 'right',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 8,
                            }}
                          >
                            <button
                              onClick={() => openRegexTest(mask)}
                              title="Test Regex"
                              style={{
                                ...iconBtnBase,
                                color:
                                  hoveredEl === `test-${mask.id}`
                                    ? '#7e22ce'
                                    : '#a855f7',
                              }}
                              onMouseEnter={() =>
                                setHoveredEl(`test-${mask.id}`)
                              }
                              onMouseLeave={() => setHoveredEl(null)}
                            >
                              <FlaskConical style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={() => startEdit(mask)}
                              title="Edit"
                              style={{
                                ...iconBtnBase,
                                color:
                                  hoveredEl === `edit-${mask.id}`
                                    ? '#1d4ed8'
                                    : '#3b82f6',
                              }}
                              onMouseEnter={() =>
                                setHoveredEl(`edit-${mask.id}`)
                              }
                              onMouseLeave={() => setHoveredEl(null)}
                            >
                              <Pencil style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                              onClick={() => handleRemove(mask.id)}
                              title="Remove"
                              style={{
                                ...iconBtnBase,
                                color:
                                  hoveredEl === `remove-${mask.id}`
                                    ? '#b91c1c'
                                    : '#ef4444',
                              }}
                              onMouseEnter={() =>
                                setHoveredEl(`remove-${mask.id}`)
                              }
                              onMouseLeave={() => setHoveredEl(null)}
                            >
                              <Trash2 style={{ width: 16, height: 16 }} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regex Test Modal */}
      {regexModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={closeRegexTest}
        >
          <div
            style={{
              minWidth: 400,
              maxWidth: 500,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px 0' }}>
              Test Regex
            </h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Pattern</label>
              <code
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  boxSizing: 'border-box',
                }}
              >
                {regexModal.pattern}
              </code>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Test String</label>
              <input
                type="text"
                value={testInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setTestInput(val);
                  if (!val) {
                    setTestResult(null);
                    return;
                  }
                  try {
                    const regex = new RegExp(regexModal.pattern);
                    setTestResult({ valid: regex.test(val) });
                  } catch (err: any) {
                    setTestResult({ valid: false, error: err.message });
                  }
                }}
                placeholder="Enter text to test against regex"
                style={{
                  ...inputStyle,
                  border: !testInput
                    ? '1px solid #d1d5db'
                    : testResult?.valid && !testResult?.error
                      ? '1px solid #4ade80'
                      : '1px solid #f87171',
                  background: !testInput
                    ? '#fff'
                    : testResult?.valid && !testResult?.error
                      ? '#f0fdf4'
                      : '#fef2f2',
                }}
                autoFocus
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {testResult && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: testResult.error
                      ? '#dc2626'
                      : testResult.valid
                        ? '#16a34a'
                        : '#dc2626',
                  }}
                >
                  {testResult.error
                    ? `Invalid regex: ${testResult.error}`
                    : testResult.valid
                      ? '✓ Match'
                      : '✗ No match'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeRegexTest}
                style={{
                  ...btnBase,
                  background:
                    hoveredEl === 'modal-close' ? '#d1d5db' : '#e5e7eb',
                  color: '#374151',
                }}
                onMouseEnter={() => setHoveredEl('modal-close')}
                onMouseLeave={() => setHoveredEl(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaskManagerView;
