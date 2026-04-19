import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Info, Activity, MessageSquare, Paperclip, History, Pencil, Check, X } from 'lucide-react';
import { getTicket, getComments, updateTicket, getTicketHistory } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import useAppStore from '../../stores/useAppStore';
import Badge from '../../components/shared/Badge';
import SlaTimer from '../../components/shared/SlaTimer';
import Avatar from '../../components/shared/Avatar';
import StatusTimeline from '../../components/shared/StatusTimeline';
import CommentCompose from '../../components/shared/CommentCompose';
import { relativeTime, fullDate } from '../../utils/formatters';
import './ClientTicketDetail.css';

const STATUS_FLOW = ['OPEN','TRIAGED','ACKNOWLEDGED','IN_PROGRESS','PENDING_CLIENT','PENDING_RELEASE','RESOLVED','CLOSED'];

function isInternalUser(userId, usersData) {
  const u = usersData.find((x) => x.user_id === userId);
  return u ? !u.tenant_id : false;
}

export default function ClientTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { addToast } = useAppStore();

  const [activeTab, setActiveTab] = useState('comments');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

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

  const saveMut = useMutation({
    mutationFn: (data) => updateTicket(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['ticket', id]);
      addToast({ type: 'success', message: 'Ticket updated.' });
    },
    onError: () => addToast({ type: 'error', message: 'Failed to save changes.' }),
  });

  if (isLoading || !ticket) return <div className="page"><p>Loading…</p></div>;

  const timelineSteps = STATUS_FLOW.map((s) => ({
    label: s.replace(/_/g, ' '),
    done: STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(ticket.status),
    active: s === ticket.status,
  }));

  const visibleComments = comments.filter((c) => !c.is_internal);

  function startEditTitle() {
    setDraftTitle(ticket.title);
    setEditingTitle(true);
  }
  function cancelEditTitle() { setEditingTitle(false); }
  function saveTitle() {
    if (draftTitle.trim() && draftTitle !== ticket.title) {
      saveMut.mutate({ title: draftTitle.trim() });
    }
    setEditingTitle(false);
  }

  function startEditDesc() {
    setDraftDesc(ticket.description || '');
    setEditingDesc(true);
  }
  function cancelEditDesc() { setEditingDesc(false); }
  function saveDesc() {
    if (draftDesc !== ticket.description) {
      saveMut.mutate({ description: draftDesc });
    }
    setEditingDesc(false);
  }

  return (
    <div className="ctd-layout">

      {/* ── LEFT — main ── */}
      <div className="ctd-main">

        <button className="back-btn" onClick={() => navigate('/client/tickets')}>
          <ChevronLeft size={15} /> Back to tickets
        </button>

        {/* Ticket header card */}
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
                className="ctd-title-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelEditTitle(); }}
                autoFocus
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
                  className="ctd-desc-textarea"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  rows={5}
                  autoFocus
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
              <p className="ctd-desc">{ticket.description || <span className="dim-text">No description provided.</span>}</p>
            )}
          </div>
        </div>

        {/* Tabs: Comments | History */}
        <div className="ctd-thread">
          <div className="ctd-tabs">
            <button
              className={`ctd-tab ${activeTab === 'comments' ? 'ctd-tab--active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={13} /> Comments
              {visibleComments.length > 0 && <span className="ctd-tab-count">{visibleComments.length}</span>}
            </button>
            <button
              className={`ctd-tab ${activeTab === 'history' ? 'ctd-tab--active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={13} /> History
            </button>

          </div>

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <>
              <CommentCompose
                ticketId={id}
                showInternal={false}
                onPosted={() => qc.invalidateQueries(['ticket-comments', id])}
              />
              {visibleComments.length === 0 ? (
                <p className="dim-text">No replies yet. Be the first to comment.</p>
              ) : (
                <div className="comment-list">
                  {visibleComments.map((c) => {
                    const name = userMap[c.user_id] || `User #${c.user_id}`;
                    const internal = isInternalUser(c.user_id, usersData);
                    return (
                      <div key={c.id} className={`comment-item ${internal ? 'comment--agent' : 'comment--client'}`}>
                        <Avatar name={name} size="md" />
                        <div className="comment-body">
                          <div className="comment-header">
                            <span className="comment-author">{name}</span>
                            {internal && <span className="agent-tag">Support</span>}
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

          {/* History tab */}
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

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Info size={11} />Details</div>
          <div className="ctd-detail-grid">
            <span className="detail-key">Type</span>
            <span>{ticket.category?.replace(/_/g, ' ') || '—'}</span>
            <span className="detail-key">Priority</span>
            <span>{ticket.priority || '—'}</span>
            <span className="detail-key">Severity</span>
            <span>{ticket.severity || '—'}</span>
            <span className="detail-key">Assigned</span>
            <span>{ticket.assigned_to ? ticket.assigned_to.split('@')[0] : '—'}</span>
            <span className="detail-key">Opened</span>
            <span>{relativeTime(ticket.created_at)}</span>
            <span className="detail-key">Updated</span>
            <span>{relativeTime(ticket.updated_at)}</span>
          </div>
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Activity size={11} />Progress</div>
          <StatusTimeline steps={timelineSteps} />
        </div>

      </div>
    </div>
  );
}
