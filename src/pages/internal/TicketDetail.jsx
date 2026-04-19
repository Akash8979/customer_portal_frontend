import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Info, Activity, MessageSquare, Paperclip, History, Lock } from 'lucide-react';
import { getTicket, getComments, updateStatus, getTicketHistory } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import { useAI } from '../../hooks/useAI';
import Badge from '../../components/shared/Badge';
import SlaTimer from '../../components/shared/SlaTimer';
import StatusTimeline from '../../components/shared/StatusTimeline';
import Avatar from '../../components/shared/Avatar';
import CommentCompose from '../../components/shared/CommentCompose';
import { relativeTime, fullDate } from '../../utils/formatters';
import './TicketDetail.css';

const STATUS_FLOW = ['OPEN','TRIAGED','ACKNOWLEDGED','IN_PROGRESS','PENDING_CLIENT','PENDING_RELEASE','RESOLVED','CLOSED'];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ai = useAI();
  const [activeTab, setActiveTab] = useState('comments');

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

  const changeStatus = useMutation({
    mutationFn: (s) => updateStatus(id, s),
    onSuccess: () => qc.invalidateQueries(['ticket', id]),
  });

  if (isLoading || !ticket) return <div className="page"><p>Loading…</p></div>;

  const timelineSteps = STATUS_FLOW.map((s) => ({
    label: s.replace(/_/g, ' '),
    done: STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(ticket.status),
    active: s === ticket.status,
  }));

  const visibleComments = activeTab === 'internal'
    ? comments.filter((c) => c.is_internal)
    : comments.filter((c) => !c.is_internal);

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

          <h1 className="ctd-title">{ticket.title}</h1>

          <div className="ctd-header-divider" />

          <div className="ctd-desc-section">
            <span className="ctd-desc-label">Description</span>
            <p className="ctd-desc">{ticket.description || <span className="dim-text">No description.</span>}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="ctd-thread">
          <div className="ctd-tabs">
            <button className={`ctd-tab ${activeTab === 'comments' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('comments')}>
              <MessageSquare size={13} /> Comments
              {comments.filter(c => !c.is_internal).length > 0 && (
                <span className="ctd-tab-count">{comments.filter(c => !c.is_internal).length}</span>
              )}
            </button>
            <button className={`ctd-tab ${activeTab === 'internal' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('internal')}>
              <Lock size={13} /> Internal Notes
              {comments.filter(c => c.is_internal).length > 0 && (
                <span className="ctd-tab-count">{comments.filter(c => c.is_internal).length}</span>
              )}
            </button>
            <button className={`ctd-tab ${activeTab === 'history' ? 'ctd-tab--active' : ''}`} onClick={() => setActiveTab('history')}>
              <History size={13} /> History
            </button>
          </div>

          {/* Comments / Internal tabs */}
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
          <div className="ctd-sidebar-label"><Activity size={11} /> Status</div>
          <select
            className="status-select"
            value={ticket.status}
            onChange={(e) => changeStatus.mutate(e.target.value)}
          >
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Info size={11} /> Details</div>
          <div className="ctd-detail-grid">
            <span className="detail-key">Type</span>
            <span>{ticket.category?.replace(/_/g, ' ') || '—'}</span>
            <span className="detail-key">Priority</span>
            <span>{ticket.priority || '—'}</span>
            <span className="detail-key">Severity</span>
            <span>{ticket.severity || '—'}</span>
            <span className="detail-key">Assigned</span>
            <span>{ticket.assigned_to || '—'}</span>
            <span className="detail-key">Created by</span>
            <span>{ticket.created_by || '—'}</span>
            <span className="detail-key">Source</span>
            <span>{ticket.source || '—'}</span>
            <span className="detail-key">Escalated</span>
            <span>{ticket.is_escalated ? '⚠ Yes' : 'No'}</span>
            <span className="detail-key">CSAT</span>
            <span>{ticket.csat_rating ? `${ticket.csat_rating}/5` : '—'}</span>
            <span className="detail-key">Opened</span>
            <span>{relativeTime(ticket.created_at)}</span>
            <span className="detail-key">Updated</span>
            <span>{relativeTime(ticket.updated_at)}</span>
          </div>
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label"><Activity size={11} /> Progress</div>
          <StatusTimeline steps={timelineSteps} />
        </div>

      </div>
    </div>
  );
}
