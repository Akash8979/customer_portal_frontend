import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTicket, getComments, updateStatus } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import { useAI } from '../../hooks/useAI';
import Badge from '../../components/shared/Badge';
import SlaTimer from '../../components/shared/SlaTimer';
import StatusTimeline from '../../components/shared/StatusTimeline';
import Button from '../../components/shared/Button';
import Avatar from '../../components/shared/Avatar';
import CommentCompose from '../../components/shared/CommentCompose';
import { relativeTime, fullDate } from '../../utils/formatters';
import './TicketDetail.css';

const STATUS_FLOW = ['OPEN','TRIAGED','ACKNOWLEDGED','IN_PROGRESS','PENDING_CLIENT','PENDING_RELEASE','RESOLVED','CLOSED'];

export default function TicketDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const ai = useAI();
  const [tab, setTab] = useState('thread');

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
    queryFn: () => getComments(id).then((r) => r.data.data),
  });

  const changeStatus = useMutation({
    mutationFn: (status) => updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['ticket', id]),
  });

  if (isLoading || !ticket) return <div className="page"><p>Loading…</p></div>;

  const timelineSteps = STATUS_FLOW.map((s) => ({
    label: s.replace(/_/g, ' '),
    done: STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(ticket.status),
    active: s === ticket.status,
  }));

  return (
    <div className="ticket-detail-layout">
      {/* LEFT — thread */}
      <div className="ticket-main">
        <div className="ticket-title-row">
          <button className="back-btn" onClick={() => window.history.back()}>← Back</button>
          <div className="ticket-meta-row">
            <span className="ticket-id-label">#{ticket.id}</span>
            <Badge status={ticket.status} />
            {ticket.priority && <Badge priority={ticket.priority} />}
            {ticket.sla?.resolution_due_at && (
              <SlaTimer deadline={ticket.sla.resolution_due_at} label="SLA" />
            )}
          </div>
          <h1 className="ticket-title">{ticket.title}</h1>
          <p className="ticket-desc">{ticket.description}</p>
        </div>

        {/* tabs */}
        <div className="tab-bar">
          {['thread', 'internal'].map((t) => (
            <button key={t} className={`tab ${tab === t ? 'tab--active' : ''}`} onClick={() => setTab(t)}>
              {t === 'thread' ? 'Thread' : 'Internal Notes'}
            </button>
          ))}
        </div>

        <div className="comment-list">
          {comments
            .filter((c) => tab === 'internal' ? true : !c.is_internal)
            .map((c) => {
              const name = userMap[c.user_id] || `User #${c.user_id}`;
              return (
                <div key={c.id} className={`comment-item ${c.is_internal ? 'comment--internal' : ''}`}>
                  <Avatar name={name} size={32} />
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
                            📎 {a.file_name}
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

        <CommentCompose
          ticketId={id}
          showInternal={true}
          onPosted={() => qc.invalidateQueries(['ticket-comments', id])}
        />
      </div>

      {/* RIGHT — metadata */}
      <div className="ticket-sidebar">
        <div className="meta-section">
          <div className="meta-label">Status</div>
          <select
            className="meta-select"
            value={ticket.status}
            onChange={(e) => changeStatus.mutate(e.target.value)}
          >
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="meta-section">
          <div className="meta-label">Details</div>
          <div className="meta-grid">
            <span className="meta-key">Assigned to</span><span>{ticket.assigned_to || '—'}</span>
            <span className="meta-key">Created by</span><span>{ticket.created_by}</span>
            <span className="meta-key">Source</span><span>{ticket.source || '—'}</span>
            <span className="meta-key">Severity</span><span>{ticket.severity || '—'}</span>
            <span className="meta-key">Escalated</span><span>{ticket.is_escalated ? '⚠ Yes' : 'No'}</span>
            <span className="meta-key">CSAT</span><span>{ticket.csat_rating ? `${ticket.csat_rating}/5` : '—'}</span>
          </div>
        </div>

        <div className="meta-section">
          <div className="meta-label">Timeline</div>
          <StatusTimeline steps={timelineSteps} />
        </div>

        <div className="meta-section">
          <div className="meta-label">AI Actions</div>
          <div className="ai-actions">
            <Button variant="ai" size="sm" onClick={() => ai.summariseThread(id)}>✦ Summarise Thread</Button>
            <Button variant="ai" size="sm" onClick={() => ai.analyseSentiment(comments.map((c) => c.message).join('\n'))}>✦ Sentiment Analysis</Button>
            <Button variant="ai" size="sm" onClick={() => ai.agentRun({ user_prompt: 'Suggest likely root cause for this bug based on the description and comments', context_data: { ticket } })}>✦ Root Cause</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
