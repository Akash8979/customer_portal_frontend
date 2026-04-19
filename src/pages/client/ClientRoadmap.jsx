import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronUp, Lightbulb, Rocket, Package } from 'lucide-react';
import { listFeatures, voteFeature, listFeatureRequests, createFeatureRequest } from '../../api/releases';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import useAppStore from '../../stores/useAppStore';
import './ClientRoadmap.css';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEAR = new Date().getFullYear();

const QUARTER_ACCENT = {
  Q1: 'var(--blue)',
  Q2: 'var(--amber)',
  Q3: 'var(--purple)',
  Q4: 'var(--green)',
};

const STATUS_ACCENT = {
  BACKLOG:     'var(--text-dim)',
  PLANNED:     'var(--amber)',
  IN_DEV:      'var(--blue)',
  IN_QA:       'var(--purple)',
  IN_STAGING:  'var(--orange)',
  RELEASED:    'var(--green)',
  DECLINED:    'var(--red)',
};

const FR_ACCENT = {
  UNDER_REVIEW: 'var(--amber)',
  ON_ROADMAP:   'var(--green)',
  DECLINED:     'var(--red)',
  RELEASED:     'var(--purple)',
};

export default function ClientRoadmap() {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ title: '', description: '' });

  const { data: features = [] } = useQuery({
    queryKey: ['public-features'],
    queryFn: () => listFeatures({ page_size: 100, is_public: 'true' }).then((r) => r.data.data || []),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-feature-requests'],
    queryFn: () => listFeatureRequests({ page_size: 20 }).then((r) => r.data.data || []),
  });

  const voteMut = useMutation({
    mutationFn: (id) => voteFeature(id),
    onSuccess: () => {
      qc.invalidateQueries(['public-features']);
      addToast({ type: 'success', message: 'Vote registered.' });
    },
  });

  const requestMut = useMutation({
    mutationFn: createFeatureRequest,
    onSuccess: () => {
      qc.invalidateQueries(['my-feature-requests']);
      setShowRequest(false);
      setReqForm({ title: '', description: '' });
      addToast({ type: 'success', message: 'Feature request submitted.' });
    },
  });

  const featuresByQuarter = QUARTERS.reduce((acc, q) => {
    acc[q] = features.filter((f) => f.quarter === q && f.year === YEAR);
    return acc;
  }, {});

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Roadmap</h1>
          <p className="page-subtitle">{YEAR} — upcoming features and improvements</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Lightbulb size={13} />}
          onClick={() => setShowRequest(true)}
        >
          Request Feature
        </Button>
      </div>

      {/* ── Quarter lanes ── */}
      <div className="roadmap-grid">
        {QUARTERS.map((q) => {
          const items = featuresByQuarter[q];
          const accent = QUARTER_ACCENT[q];
          return (
            <div key={q} className="roadmap-lane">

              {/* Lane header */}
              <div className="lane-header" style={{ '--lane-accent': accent }}>
                <div className="lane-header-left">
                  <span className="lane-q">{q}</span>
                  <span className="lane-year">{YEAR}</span>
                </div>
                {items.length > 0 && (
                  <span className="lane-count">{items.length}</span>
                )}
              </div>

              {/* Feature cards */}
              <div className="lane-cards">
                {items.length === 0 ? (
                  <div className="lane-empty">
                    <Rocket size={18} className="lane-empty-icon" />
                    <span>Nothing planned yet</span>
                  </div>
                ) : items.map((feature) => {
                  const cardAccent = STATUS_ACCENT[feature.status] || 'var(--border-mid)';
                  return (
                    <div
                      key={feature.id}
                      className="rm-card"
                      style={{ '--card-accent': cardAccent }}
                    >
                      <div className="rm-card-header">
                        <Badge status={feature.status} />
                        <button
                          className="vote-btn"
                          onClick={() => voteMut.mutate(feature.id)}
                          title="Upvote"
                        >
                          <ChevronUp size={12} />
                          <span>{feature.vote_count ?? 0}</span>
                        </button>
                      </div>

                      <div className="rm-card-title">{feature.title}</div>

                      {feature.description && (
                        <p className="rm-card-desc">{feature.description}</p>
                      )}

                      {feature.estimated_release && (
                        <div className="rm-card-eta">
                          <Package size={10} />
                          Est. {feature.estimated_release}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── My Feature Requests ── */}
      {myRequests.length > 0 && (
        <div className="fr-section">
          <div className="fr-section-header">
            <h2 className="fr-section-title">
              <Lightbulb size={14} className="fr-section-icon" />
              My Feature Requests
            </h2>
            <span className="fr-section-count">{myRequests.length}</span>
          </div>

          <div className="fr-list">
            {myRequests.map((req) => {
              const accent = FR_ACCENT[req.status] || 'var(--border-mid)';
              return (
                <div key={req.id} className="fr-item" style={{ '--fr-accent': accent }}>
                  <span className="fr-item-dot" />
                  <div className="fr-item-body">
                    <div className="fr-item-title">{req.title}</div>
                    {req.decline_reason && (
                      <div className="fr-item-reason">{req.decline_reason}</div>
                    )}
                  </div>
                  <Badge status={req.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Request modal ── */}
      <Modal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        title="Request a Feature"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={requestMut.isPending}
              onClick={() => requestMut.mutate(reqForm)}
              disabled={!reqForm.title.trim()}
            >
              Submit Request
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-field">
            <label>Feature Title</label>
            <input
              placeholder="What would you like us to build?"
              value={reqForm.title}
              onChange={(e) => setReqForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              rows={4}
              placeholder="Describe the problem it solves and how you'd use it…"
              value={reqForm.description}
              onChange={(e) => setReqForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
