import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Info, Activity, MessageSquare, Paperclip, History, Lock, Pencil, Check, X } from 'lucide-react';
import { getTicket, getComments, updateTicket, getTicketHistory } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import { useAI } from '../../hooks/useAI';
import useAppStore from '../../stores/useAppStore';
import Badge from '../../components/shared/Badge';
import SlaTimer from '../../components/shared/SlaTimer';
import StatusTimeline from '../../components/shared/StatusTimeline';
import Avatar from '../../components/shared/Avatar';
import CommentCompose from '../../components/shared/CommentCompose';
import { relativeTime, fullDate } from '../../utils/formatters';
import './TicketDetail.css';

const STATUS_FLOW = ['OPEN','TRIAGED','ACKNOWLEDGED','IN_PROGRESS','PENDING_CLIENT','PENDING_RELEASE','RESOLVED','CLOSED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORY_OPTIONS = [
  'BUG', 'FEATURE_REQUEST', 'QUESTION', 'ONBOARDING_ISSUE',
  'INTEGRATION_ISSUE', 'PERFORMANCE_ISSUE', 'SUPPORT', 'BILLING', 'OTHER',
];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ai = useAI();
  const { addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState('comments');

  // Title / description edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle]     = useState('');
  const [editingDesc, setEditingDesc]   = useState(false);
  const [draftDesc, setDraftDesc]       = useState('');

  // Assigned-to edit
  const [editingAssigned, setEditingAssigned] = useState(false);
  const [draftAssigned, setDraftAssigned]     = useState('');

  // Tags edit
  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags]     = useState('');

  const { data: usersData = [] } = useQuery({
    queryKey: ['mention-users'],
    queryFn: () => listMentionUsers().then((r) => r.data.data || []),
    staleTime: 5 * 60 * 1000,
  });
  const userMap = Object.fromEntries(usersData.map((u) => [u.user_id, u.user_name]));

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id).then((r) => r.data.data),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => getComments(id).then((r) => r.data.data || []),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['ticket-history', id],
    queryFn: () => getTicketHistory(id).then((r) => r.data.data || []).catch(() => []),
    enabled: activeTab === 'history',
    retry: false,
  });

  // Sync local text drafts when ticket data refreshes
  useEffect(() => {
    if (ticket) {
      setDraftAssigned(ticket.assigned_to || '');
      setDraftTags((ticket.tags || []).join(', '));
    }
  }, [ticket?.assigned_to, ticket?.tags]);

  const saveMut = useMutation({
    mutationFn: (data) => updateTicket(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['ticket', id]);
      qc.invalidateQueries(['ticket-history', id]);
      addToast({ type: 'success', message: 'Ticket updated.' });
    },
    onError: () => addToast({ type: 'error', message: 'Failed to save changes.' }),
  });

  function updateField(field, value) {
    saveMut.mutate({ [field]: value });
  }

  if (isLoading || !ticket) return <div className="page"><p>Loading…</p></div>;

  const timelineSteps = STATUS_FLOW.map((s) => ({
    label: s.replace(/_/g, ' '),
    done: STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(ticket.status),
    active: s === ticket.status,
  }));

  const visibleComments = activeTab === 'internal'
    ? comments.filter((c) => c.is_internal)
    : comments.filter((c) => !c.is_internal);

  // Title handlers
  function startEditTitle()  { setDraftTitle(ticket.title); setEditingTitle(true); }
  function cancelEditTitle() { setEditingTitle(false); }
  function saveTitle() {
    if (draftTitle.trim() && draftTitle !== ticket.title) updateField('title', draftTitle.trim());
    setEditingTitle(false);
  }

  // Description handlers
  function startEditDesc()  { setDraftDesc(ticket.description || ''); setEditingDesc(true); }
  function cancelEditDesc() { setEditingDesc(false); }
  function saveDesc() {
    if (draftDesc !== ticket.description) updateField('description', draftDesc);
    setEditingDesc(false);
  }

  // Assigned-to handlers
  function saveAssigned() {
    if (draftAssigned !== (ticket.assigned_to || '')) {
      updateField('assigned_to', draftAssigned || null);
    }
    setEditingAssigned(false);
  }

  // Tags handlers
  function saveTags() {
    const tags = draftTags.split(',').map((t) => t.trim()).filter(Boolean);
    updateField('tags', tags);
    setEditingTags(false);
  }

  return (
    <div className="ctd-layout">

      {/* Floating AI button */}
      <button className="ai-fab" onClick={() => ai.summariseThread(id)}>
        ✦ AI Summary
      </button>

      {/* ── LEFT — main ── */}
      <div className="ctd-main">
        <button className="back-btn" onClick={() => navigate('/internal/tickets')}>
          <ChevronLeft size={15} /> Back to tickets
        </button>

        {/* Header card */}
        <div className="ctd-header">
          <div className="ctd-meta-row">
            <span className="ticket-id">#{ticket.id}</span>
            <Badge status={ticket.status} />
            {ticket.priority && <Badge priority={ticket.priority} />}
            {ticket.is_escalated && <span className="escalated-badge">⚠ Escalated</span>}
            {ticket.sla?.resolution_due_at && (
              <SlaTimer deadline={ticket.sla.resolution_due_at} label="SLA" />
            )}
          </div>

          {/* Editable title */}
          {editingTitle ? (
            <div className="ctd-edit-row">
              <input
                autoFocus
                className="ctd-title-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelEditTitle(); }}
              />
              <button className="ctd-edit-action ctd-edit-save" onClick={saveTitle} title="Save"><Check size={14} /></button>
              <button className="ctd-edit-action ctd-edit-cancel" onClick={cancelEditTitle} title="Cancel"><X size={14} /></button>
            </div>
          ) : (
            <div className="ctd-title-row">
              <h1 className="ctd-title">{ticket.title}</h1>
              <button className="ctd-edit-btn" onClick={startEditTitle} title="Edit title"><Pencil size={13} /></button>
            </div>
          )}

          <div className="ctd-header-divider" />

          {/* Editable description */}
          <div className="ctd-desc-section">
            <div className="ctd-desc-header">
              <span className="ctd-desc-label">Description</span>
              {!editingDesc && (
                <button className="ctd-edit-btn" onClick={startEditDesc} title="Edit description"><Pencil size={12} /></button>
              )}
            </div>
            {editingDesc ? (
              <div className="ctd-desc-edit">
                <textarea
                  autoFocus
                  className="ctd-desc-textarea"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  rows={5}
                />
                <div className="ctd-desc-edit-actions">
                  <button className="ctd-save-btn" onClick={saveDesc} disabled={saveMut.isPending}>
                    <Check size={13} /> Save
                  </button>
                  <button className="ctd-cancel-btn" onClick={cancelEditDesc}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="ctd-desc">{ticket.description || <span className="dim-text">No description.</span>}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="ctd-thread">
          <div className="ctd-tabs">
            <button className={`ctd-tab ${activeTab === 'comments' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('comments')}>
              <MessageSquare size={13} /> Comments
              {comments.filter((c) => !c.is_internal).length > 0 && (
                <span className="ctd-tab-count">{comments.filter((c) => !c.is_internal).length}</span>
              )}
            </button>
            <button className={`ctd-tab ${activeTab === 'internal' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('internal')}>
              <Lock size={13} /> Internal Notes
              {comments.filter((c) => c.is_internal).length > 0 && (
                <span className="ctd-tab-count">{comments.filter((c) => c.is_internal).length}</span>
              )}
            </button>
            <button className={`ctd-tab ${activeTab === 'history' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('history')}>
              <History size={13} /> History
            </button>
          </div>

          {(activeTab === 'comments' || activeTab === 'internal') && (
            <>
              <CommentCompose
                ticketId={id}
                showInternal={true}
                onPosted={() => qc.invalidateQueries(['ticket-comments', id])}
              />
              {visibleComments.length === 0 ? (
                <p className="dim-text">No {activeTab === 'internal' ? 'internal notes' : 'replies'} yet.</p>
              ) : (
                <div className="comment-list">
                  {visibleComments.map((c) => {
                    const name = userMap[c.user_id] || `User #${c.user_id}`;
                    return (
                      <div key={c.id} className={`comment-item ${c.is_internal ? 'comment--internal' : 'comment--client'}`}>
                        <Avatar name={name} size="md" />
                        <div className="comment-body">
                          <div className="comment-header">
                            <span className="comment-author">{name}</span>
                            {c.is_internal && <span className="internal-tag">Internal</span>}
                            <span className="comment-time" title={fullDate(c.created_at)}>{relativeTime(c.created_at)}</span>
                          </div>
                          <p className="comment-text">{c.message}</p>
                          {c.attachments?.length > 0 && (
                            <div className="comment-attachments">
                              {c.attachments.map((a) => (
                                <a key={a.id} className="comment-attachment" href={a.file_path} target="_blank" rel="noreferrer">
                                  <Paperclip size={11} /> {a.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                          {c.mentions?.length > 0 && (
                            <div className="comment-mentions">
                              {c.mentions.map((m) => (
                                <span key={m.id} className="mention-chip">@{userMap[m.mentioned_user_id] || m.mentioned_user_id}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="ctd-history">
              {history.length === 0 ? (
                <div className="ctd-history-empty">
                  <History size={28} className="ctd-history-empty-icon" />
                  <p>No history recorded yet.</p>
                </div>
              ) : (
                <div className="ctd-history-list">
                  {history.map((entry, i) => (
                    <div key={entry.id ?? i} className="ctd-history-item">
                      <div className="ctd-history-dot" />
                      <div className="ctd-history-body">
                        <span className="ctd-history-actor">{userMap[entry.user_id] || 'System'}</span>
                        <span className="ctd-history-action">{entry.action?.replace(/_/g, ' ') || 'updated ticket'}</span>
                        {entry.old_value && entry.new_value && (
                          <span className="ctd-history-change">
                            <span className="ctd-history-old">{entry.old_value}</span>
                            <span className="ctd-history-arrow">→</span>
                            <span className="ctd-history-new">{entry.new_value}</span>
                          </span>
                        )}
                        <span className="ctd-history-time" title={fullDate(entry.created_at)}>{relativeTime(entry.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT — sidebar ── */}
      <div className="ctd-sidebar">

        {/* Status */}
        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Activity size={11} /> Status</div>
          <select
            className="ctd-field-select"
            value={ticket.status}
            onChange={(e) => updateField('status', e.target.value)}
          >
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Details — all editable */}
        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Info size={11} /> Details</div>
          <div className="ctd-detail-grid">

            <span className="detail-key">Priority</span>
            <select
              className="ctd-field-select"
              value={ticket.priority || ''}
              onChange={(e) => updateField('priority', e.target.value || null)}
            >
              <option value="">—</option>
              {PRIORITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <span className="detail-key">Severity</span>
            <select
              className="ctd-field-select"
              value={ticket.severity || ''}
              onChange={(e) => updateField('severity', e.target.value || null)}
            >
              <option value="">—</option>
              {SEVERITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <span className="detail-key">Type</span>
            <select
              className="ctd-field-select"
              value={ticket.category || ''}
              onChange={(e) => updateField('category', e.target.value || null)}
            >
              <option value="">—</option>
              {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>

            <span className="detail-key">Assigned</span>
            {editingAssigned ? (
              <input
                autoFocus
                className="ctd-field-input"
                value={draftAssigned}
                onChange={(e) => setDraftAssigned(e.target.value)}
                onBlur={saveAssigned}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveAssigned();
                  if (e.key === 'Escape') { setDraftAssigned(ticket.assigned_to || ''); setEditingAssigned(false); }
                }}
              />
            ) : (
              <span className="ctd-field-clickable" onClick={() => setEditingAssigned(true)}>
                {ticket.assigned_to || <span className="ctd-field-empty">Unassigned</span>}
              </span>
            )}

            <span className="detail-key">Due Date</span>
            <input
              type="date"
              className="ctd-field-input ctd-date-input"
              value={ticket.due_date ? ticket.due_date.split('T')[0] : ''}
              onChange={(e) => updateField('due_date', e.target.value || null)}
            />

            <span className="detail-key">Escalated</span>
            <label className="ctd-escalate-toggle">
              <input
                type="checkbox"
                checked={ticket.is_escalated || false}
                onChange={(e) => updateField('is_escalated', e.target.checked)}
              />
              <span>{ticket.is_escalated ? '⚠ Yes' : 'No'}</span>
            </label>

            <span className="detail-key">Tags</span>
            {editingTags ? (
              <input
                autoFocus
                className="ctd-field-input"
                value={draftTags}
                placeholder="tag1, tag2"
                onChange={(e) => setDraftTags(e.target.value)}
                onBlur={saveTags}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTags();
                  if (e.key === 'Escape') { setDraftTags((ticket.tags || []).join(', ')); setEditingTags(false); }
                }}
              />
            ) : (
              <span className="ctd-field-clickable ctd-tags-wrap" onClick={() => setEditingTags(true)}>
                {ticket.tags?.length > 0
                  ? ticket.tags.map((t) => <span key={t} className="ctd-tag-chip">{t}</span>)
                  : <span className="ctd-field-empty">Add tags</span>}
              </span>
            )}

            <span className="detail-key">Created by</span>
            <span>{ticket.created_by || '—'}</span>

            <span className="detail-key">Source</span>
            <span>{ticket.source || '—'}</span>

            <span className="detail-key">CSAT</span>
            <span>{ticket.csat_rating ? `${ticket.csat_rating}/5` : '—'}</span>

            <span className="detail-key">Opened</span>
            <span>{relativeTime(ticket.created_at)}</span>

            <span className="detail-key">Updated</span>
            <span>{relativeTime(ticket.updated_at)}</span>

          </div>
        </div>

        {/* Progress */}
        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Activity size={11} /> Progress</div>
          <StatusTimeline steps={timelineSteps} />
        </div>

      </div>
    </div>
  );
}
