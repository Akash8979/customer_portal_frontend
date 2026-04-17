import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createTicket } from '../../api/tickets';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/shared/Button';
import useAppStore from '../../stores/useAppStore';
import './RaiseTicket.css';

export default function RaiseTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: '', description: '', category: 'BUG',
    severity: 'MEDIUM', source: 'PORTAL',
  });

  const mut = useMutation({
    mutationFn: () => createTicket(form),
    onSuccess: (res) => {
      qc.invalidateQueries(['tickets']);
      addToast({ type: 'success', message: 'Ticket submitted successfully.' });
      navigate('/client/tickets');
    },
    onError: () => addToast({ type: 'error', message: 'Failed to submit ticket.' }),
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
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
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Brief, clear description of the issue" />
          </div>

          <div className="form-field">
            <label>Description <span className="required">*</span></label>
            <textarea
              rows={6} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the issue in detail — what you expected, what happened, when it started, steps to reproduce if applicable."
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Type</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
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
              <select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                {[
                  ['LOW', 'Low — minor inconvenience'],
                  ['MEDIUM', 'Medium — workaround exists'],
                  ['HIGH', 'High — significantly impacted'],
                  ['CRITICAL', 'Critical — completely blocked'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
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
            <li>Attach screenshots or files in the next step.</li>
            <li>Set severity accurately so we can prioritise correctly.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
