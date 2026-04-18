import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTicket, getComments } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import { useAI } from '../../hooks/useAI';
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
  const ai = useAI();

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

  if (isLoading || !ticket) return <div className="page"><p>Loading…</p></div>;

  const timelineSteps = STATUS_FLOW.map((s) => ({
    label: s.replace(/_/g, ' '),
    done: STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(ticket.status),
    active: s === ticket.status,
  }));

  // Client only sees non-internal comments
  const visibleComments = comments.filter((c) => !c.is_internal);

  return (
    <div className="ctd-layout">
      {/* LEFT — main thread */}
      <div className="ctd-main">
        <button className="back-btn" onClick={() => navigate('/client/tickets')}>← Back to tickets</button>

        <div className="ctd-header">
          <div className="ctd-meta-row">
            <span className="ticket-id">#{ticket.id}</span>
            <Badge status={ticket.status} />
            {ticket.priority && <Badge priority={ticket.priority} />}
            {ticket.is_escalated && <span className="escalated-badge">⚠ Escalated</span>}
          </div>
          <h1 className="ctd-title">{ticket.title}</h1>
          <p className="ctd-desc">{ticket.description}</p>
          {ticket.sla?.resolution_due_at && (
            <div style={{ marginTop: 8 }}>
              <SlaTimer deadline={ticket.sla.resolution_due_at} label="SLA deadline" />
            </div>
          )}
        </div>

        {/* Comment thread */}
        <div className="ctd-thread">
          <h3 className="ctd-thread-title">Thread <span className="ctd-comment-count">{visibleComments.length}</span></h3>

          {visibleComments.length === 0 ? (
            <p className="dim-text">No replies yet. Post a comment below.</p>
          ) : (
            <div className="comment-list">
              {visibleComments.map((c) => {
                const name = userMap[c.user_id] || `User #${c.user_id}`;
                const internal = isInternalUser(c.user_id, usersData);
                return (
                  <div key={c.id} className={`comment-item ${internal ? 'comment--agent' : 'comment--client'}`}>
                    <Avatar name={name} size={32} />
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-author">{name}</span>
                        {internal && <span className="agent-tag">Support</span>}
                        <span className="comment-time" title={fullDate(c.created_at)}>{relativeTime(c.created_at)}</span>
                      </div>
                      <p className="comment-text">{c.message}</p>

                      {/* Attachments */}
                      {c.attachments?.length > 0 && (
                        <div className="comment-attachments">
                          {c.attachments.map((a) => (
                            <a key={a.id} className="comment-attachment" href={a.file_path} target="_blank" rel="noreferrer">
                              📎 {a.file_name}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Mentions */}
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

          <CommentCompose
            ticketId={id}
            showInternal={false}
            onPosted={() => qc.invalidateQueries(['ticket-comments', id])}
          />
        </div>
      </div>

      {/* RIGHT — sidebar */}
      <div className="ctd-sidebar">
        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label">Status</div>
          <Badge status={ticket.status} />
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label">Details</div>
          <div className="ctd-detail-grid">
            <span className="detail-key">Type</span>
            <span>{ticket.category?.replace(/_/g, ' ') || '—'}</span>
            <span className="detail-key">Priority</span>
            <span>{ticket.priority || '—'}</span>
            <span className="detail-key">Severity</span>
            <span>{ticket.severity || '—'}</span>
            <span className="detail-key">Assigned to</span>
            <span>{ticket.assigned_to ? ticket.assigned_to.split('@')[0] : '—'}</span>
            <span className="detail-key">Opened</span>
            <span>{relativeTime(ticket.created_at)}</span>
            <span className="detail-key">Updated</span>
            <span>{relativeTime(ticket.updated_at)}</span>
          </div>
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label">Progress</div>
          <StatusTimeline steps={timelineSteps} />
        </div>

        <div className="ctd-sidebar-section">
          <div className="ctd-sidebar-label">AI</div>
          <button
            className="ai-brief-btn"
            onClick={() => ai.agentRun({ user_prompt: 'Summarise this ticket status and suggest what information the client should provide to help resolve it faster', context_data: { ticket, comments: visibleComments } })}
          >
            ✦ Get AI Summary
          </button>
        </div>
      </div>
    </div>
  );
}
