import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFeatures, createFeature, updateFeature } from '../../api/releases';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import { shortDate } from '../../utils/formatters';
import './DeliveryBoard.css';

const COLUMNS = ['BACKLOG', 'PLANNED', 'IN_DEV', 'IN_QA', 'IN_STAGING', 'RELEASED'];

export default function DeliveryBoard() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'BACKLOG', quarter: 'Q2', year: new Date().getFullYear() });

  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: () => listFeatures({ page_size: 200 }).then((r) => r.data.data || []),
  });

  const createMut = useMutation({
    mutationFn: createFeature,
    onSuccess: () => { qc.invalidateQueries(['features']); setShowCreate(false); },
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status }) => updateFeature(id, { status }),
    onSuccess: () => qc.invalidateQueries(['features']),
  });

  const features = data || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Delivery Board</h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ New Feature</Button>
      </div>

      <div className="delivery-board">
        {COLUMNS.map((col) => (
          <div key={col} className="board-col">
            <div className="col-header">
              <span className="col-title">{col.replace(/_/g, ' ')}</span>
              <span className="col-count">{features.filter((f) => f.status === col).length}</span>
            </div>
            <div className="col-cards">
              {features.filter((f) => f.status === col).map((feature) => (
                <div key={feature.id} className="feature-card">
                  <div className="feature-title">{feature.title}</div>
                  {feature.assignee && <div className="feature-meta">Assigned: {feature.assignee}</div>}
                  {feature.estimated_release && <div className="feature-meta">ETA: {shortDate(feature.estimated_release)}</div>}
                  <div className="feature-votes">▲ {feature.vote_count}</div>
                  <div className="feature-actions">
                    {COLUMNS.indexOf(col) < COLUMNS.length - 1 && (
                      <Button variant="ghost" size="sm" onClick={() => moveMut.mutate({ id: feature.id, status: COLUMNS[COLUMNS.indexOf(col) + 1] })}>
                        → Move
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="New Feature" size="md"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-field form-field--full">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Quarter</label>
            <select value={form.quarter} onChange={(e) => setForm((f) => ({ ...f, quarter: e.target.value }))}>
              {['Q1','Q2','Q3','Q4'].map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {COLUMNS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
