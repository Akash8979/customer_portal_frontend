import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createComment, uploadAttachment } from '../../api/tickets';
import { listMentionUsers } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';
import useAppStore from '../../stores/useAppStore';
import Button from './Button';
import Avatar from './Avatar';
import './CommentCompose.css';

export default function CommentCompose({ ticketId, onPosted, showInternal = false }) {
  const { user } = useAuth();
  const { addToast } = useAppStore();

  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState(0);
  const [mentionedIds, setMentionedIds] = useState([]);

  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  const { data: mentionUsers = [] } = useQuery({
    queryKey: ['mention-users'],
    queryFn: () => listMentionUsers().then((r) => r.data.data || []),
    staleTime: 5 * 60 * 1000,
  });

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionPos(cursor - match[0].length);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  }

  const mentionSuggestions = mentionUsers.filter(
    (u) => u.user_name.toLowerCase().includes(mentionQuery) || u.email.includes(mentionQuery)
  );

  function insertMention(u) {
    const before = text.slice(0, mentionPos);
    const after = text.slice(textareaRef.current.selectionStart);
    setText(`${before}@${u.user_name} ${after}`);
    setMentionOpen(false);
    if (!mentionedIds.includes(u.user_id)) setMentionedIds((ids) => [...ids, u.user_id]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleFileChange(e) {
    const picked = Array.from(e.target.files);
    setFiles((prev) => [
      ...prev,
      ...picked.map((f) => ({ file: f, name: f.name, uploading: false, id: null })),
    ]);
    e.target.value = '';
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.id) { results.push(f.id); continue; }
      setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, uploading: true } : x));
      try {
        const { data } = await uploadAttachment({
          file_name: f.name,
          file_type: f.file.type || 'application/octet-stream',
          file_path: `/uploads/${Date.now()}_${f.name}`,
          metadata: { size: f.file.size },
        });
        const id = data.data.id;
        results.push(id);
        setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, uploading: false, id } : x));
      } catch {
        addToast({ type: 'error', message: `Failed to attach ${f.name}.` });
        setFiles((prev) => prev.map((x, idx) => idx === i ? { ...x, uploading: false } : x));
      }
    }
    return results;
  }

  const postMut = useMutation({
    mutationFn: async () => {
      const attachment_ids = await uploadAll();
      return createComment({
        ticket_id: Number(ticketId),
        user_id: user.user_id,
        message: text.trim(),
        is_internal: isInternal,
        attachment_ids,
        mentioned_user_ids: mentionedIds,
      });
    },
    onSuccess: () => {
      setText(''); setFiles([]); setMentionedIds([]); setIsInternal(false);
      addToast({ type: 'success', message: 'Comment posted.' });
      onPosted?.();
    },
    onError: () => addToast({ type: 'error', message: 'Failed to post comment.' }),
  });

  return (
    <div className="cc-wrap">
      <Avatar name={user?.user_name} size={32} />
      <div className="cc-editor">
        <div className="cc-textarea-wrap" style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className="cc-textarea"
            rows={4}
            placeholder="Write a comment… use @ to mention someone"
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMentionOpen(false);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
                e.preventDefault(); postMut.mutate();
              }
            }}
          />
          {mentionOpen && mentionSuggestions.length > 0 && (
            <div className="mention-dropdown">
              {mentionSuggestions.map((u) => (
                <button key={u.user_id} className="mention-item" onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}>
                  <Avatar name={u.user_name} size={22} />
                  <div>
                    <span className="mention-name">{u.user_name}</span>
                    <span className="mention-email">{u.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="cc-files">
            {files.map((f, i) => (
              <div key={i} className="cc-file">
                <span className="cc-file-icon">📎</span>
                <span className="cc-file-name">{f.name}</span>
                {f.uploading && <span className="cc-file-uploading">uploading…</span>}
                {f.id && <span className="cc-file-done">✓</span>}
                <button className="cc-file-remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="cc-toolbar">
          <div className="cc-toolbar-left">
            <button className="cc-attach-btn" onClick={() => fileRef.current?.click()} title="Attach file">
              📎 Attach
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={handleFileChange} />
            {showInternal && (
              <label className="cc-internal-toggle">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Internal only
              </label>
            )}
            {mentionedIds.length > 0 && (
              <span className="cc-mentions-hint">{mentionedIds.length} mention{mentionedIds.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="cc-toolbar-right">
            <span className="cc-shortcut">⌘↵ to send</span>
            <Button variant="primary" size="sm" disabled={!text.trim()} loading={postMut.isPending} onClick={() => postMut.mutate()}>
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
