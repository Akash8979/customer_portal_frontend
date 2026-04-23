import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Paperclip, X, Loader2, CheckCircle2 } from 'lucide-react';
import { createTicket, uploadFile } from '../../api/tickets';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/shared/Button';
import useAppStore from '../../stores/useAppStore';
import './RaiseTicket.css';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/json',
];

export default function RaiseTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'BUG',
    severity: 'MEDIUM', source: 'PORTAL',
  });

  // [{ file, name, size, status: 'pending'|'uploading'|'done'|'error', id: null }]
  const [attachments, setAttachments] = useState([]);

  function handleFiles(fileList) {
    const incoming = Array.from(fileList);
    const valid = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE) {
        addToast({ type: 'error', message: `${f.name} exceeds 10 MB limit.` });
        continue;
      }
      valid.push({ file: f, name: f.name, size: f.size, status: 'pending', id: null });
    }
    setAttachments((prev) => [...prev, ...valid]);
  }

  function removeAttachment(idx) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    const results = [...attachments];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'done') continue;
      results[i] = { ...results[i], status: 'uploading' };
      setAttachments([...results]);
      try {
        const fd = new FormData();
        fd.append('file', results[i].file);
        const res = await uploadFile(fd);
        results[i] = { ...results[i], status: 'done', id: res.data.data.id };
      } catch {
        results[i] = { ...results[i], status: 'error' };
      }
      setAttachments([...results]);
    }
    return results;
  }

  const mut = useMutation({
    mutationFn: async () => {
      const uploaded = await uploadAll();
      const failedCount = uploaded.filter((a) => a.status === 'error').length;
      if (failedCount > 0) {
        addToast({ type: 'error', message: `${failedCount} file(s) failed to upload. Ticket not submitted.` });
        throw new Error('upload_failed');
      }
      const attachment_ids = uploaded.map((a) => a.id).filter(Boolean);
      return createTicket({ ...form, attachment_ids });
    },
    onSuccess: () => {
      qc.invalidateQueries(['tickets']);
      addToast({ type: 'success', message: 'Ticket submitted successfully.' });
      navigate('/client/tickets');
    },
    onError: (err) => {
      if (err?.message !== 'upload_failed') {
        addToast({ type: 'error', message: 'Failed to submit ticket.' });
      }
    },
  });

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const valid = form.title.trim() && form.description.trim();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="page-title">Raise a Ticket</h1>
        </div>
      </div>

      <div className="raise-form-wrap">
        <div className="form-section">
          <div className="form-field">
            <label>Title <span className="required">*</span></label>
            <input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Brief, clear description of the issue"
            />
          </div>

          <div className="form-field">
            <label>Description <span className="required">*</span></label>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Describe the issue in detail — what you expected, what happened, when it started, steps to reproduce if applicable."
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Type</label>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
                {[
                  ['BUG', 'Bug Report'],
                  ['FEATURE_REQUEST', 'Feature Request'],
                  ['QUESTION', 'Question'],
                  ['ONBOARDING_ISSUE', 'Onboarding Issue'],
                  ['INTEGRATION_ISSUE', 'Integration Issue'],
                  ['PERFORMANCE_ISSUE', 'Performance Issue'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Severity — how blocked are you?</label>
              <select value={form.severity} onChange={(e) => setField('severity', e.target.value)}>
                {[
                  ['LOW', 'Low — minor inconvenience'],
                  ['MEDIUM', 'Medium — workaround exists'],
                  ['HIGH', 'High — significantly impacted'],
                  ['CRITICAL', 'Critical — completely blocked'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* ── Attachments ─────────────────────────────────────────────── */}
          <div className="form-field">
            <label>Attachments <span className="form-field-hint">optional · max 10 MB each</span></label>

            <div
              className="attach-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <Paperclip size={18} className="attach-icon" />
              <span>Drop files here or <strong>browse</strong></span>
              <span className="attach-hint">PNG, JPG, PDF, DOCX, XLSX, CSV, ZIP, TXT</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES.join(',')}
              style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />

            {attachments.length > 0 && (
              <ul className="attach-list">
                {attachments.map((a, i) => (
                  <li key={i} className={`attach-item attach-item--${a.status}`}>
                    <Paperclip size={13} className="attach-item-icon" />
                    <span className="attach-item-name">{a.name}</span>
                    <span className="attach-item-size">{formatBytes(a.size)}</span>
                    <span className="attach-item-status">
                      {a.status === 'uploading' && <Loader2 size={13} className="spin" />}
                      {a.status === 'done'      && <CheckCircle2 size={13} />}
                      {a.status === 'error'     && <span className="attach-err">failed</span>}
                    </span>
                    {a.status !== 'uploading' && (
                      <button className="attach-remove" onClick={() => removeAttachment(i)} title="Remove">
                        <X size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="primary" disabled={!valid} loading={mut.isPending} onClick={() => mut.mutate()}>
              Submit Ticket
            </Button>
          </div>
        </div>

        <div className="raise-help">
          <h3 className="help-title">Tips for a faster resolution</h3>
          <ul className="help-list">
            <li>Be specific about what went wrong and when it started.</li>
            <li>Include steps to reproduce if it's a bug.</li>
            <li>Attach screenshots or log files to help our team diagnose faster.</li>
            <li>Set severity accurately so we can prioritise correctly.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
