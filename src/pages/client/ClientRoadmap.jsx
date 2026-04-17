import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFeatures, voteFeature, listFeatureRequests, createFeatureRequest } from '../../api/releases';
import { useState } from 'react';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import useAppStore from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import './ClientRoadmap.css';

const QUARTERS = ['Q1','Q2','Q3','Q4'];
const YEAR = new Date().getFullYear();

export default function ClientRoadmap() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { addToast } = useAppStore();
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ title: '', description: '' });

  const { data: features } = useQuery({
    queryKey: ['public-features'],
    queryFn: () => listFeatures({ page_size: 100, is_public: 'true' }).then((r) => r.data.data || []),
  });

  const { data: myRequests } = useQuery({
    queryKey: ['my-feature-requests'],
    queryFn: () => listFeatureRequests({ page_size: 20 }).then((r) => r.data.data || []),
  });

  const voteMut = useMutation({
    mutationFn: (id) => voteFeature(id),
    onSuccess: () => { qc.invalidateQueries(['public-features']); addToast({ type: 'success', message: 'Vote registered.' }); },
  });

  const requestMut = useMutation({
    mutationFn: createFeatureRequest,
    onSuccess: () => { qc.invalidateQueries(['my-feature-requests']); setShowRequest(false); addToast({ type: 'success', message: 'Feature request submitted.' }); },
  });

  const featuresByQuarter = QUARTERS.reduce((acc, q) => {
    acc[q] = (features || []).filter((f) => f.quarter === q && f.year === YEAR);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Roadmap</h1>
          <p className="page-subtitle">{YEAR} — upcoming features and improvements</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowRequest(true)}>+ Request Feature</Button>
      </div>

      {/* Roadmap quarters */}
      <div className="roadmap-grid">
        {QUARTERS.map((q) => (
          <div key={q} className="roadmap-quarter">
            <div className="quarter-header">{q} {YEAR}</div>
            {featuresByQuarter[q].length === 0 && <p className="dim-text">Nothing planned yet.</p>}
            {featuresByQuarter[q].map((feature) => (
              <div key={feature.id} className="roadmap-card">
                <div className="roadmap-card-top">
                  <span className="roadmap-title">{feature.title}</span>
                  <Badge status={feature.status} />
                </div>
                <p className="roadmap-desc">{feature.description}</p>
                <div className="roadmap-vote">
                  <button className="vote-btn" onClick={() => voteMut.mutate(feature.id)}>▲ {feature.vote_count}</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* My feature requests */}
      {myRequests?.length > 0 && (
        <div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>My Feature Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myRequests.map((req) => (
              <div key={req.id} className="req-row">
                <span className="req-title">{req.title}</span>
                <Badge status={req.status} />
                {req.decline_reason && <span className="req-reason">Reason: {req.decline_reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={showRequest} onClose={() => setShowRequest(false)} title="Request a Feature"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button variant="primary" loading={requestMut.isPending} onClick={() => requestMut.mutate(reqForm)}>Submit</Button>
          </div>
        }
      >
        <div className="form-section" style={{ gap: 16 }}>
          <div className="form-field"><label>Feature Title</label><input value={reqForm.title} onChange={(e) => setReqForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="form-field"><label>Description</label><textarea rows={4} value={reqForm.description} onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}
