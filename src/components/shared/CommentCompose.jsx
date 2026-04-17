import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createComment, uploadAttachment } from '../../api/tickets';
import { useAuth } from '../../hooks/useAuth';
import useAppStore from '../../stores/useAppStore';
import Button from './Button';
import Avatar from './Avatar';
import './CommentCompose.css';

// Known users for @ mention — pulled from constant.py users
const MENTION_USERS = [
  { id: 19, name: 'Sam Torres',      email: 'internal_agent_test_1@gmail.com' },
  { id: 20, name: 'Tina Rahman',     email: 'internal_agent_test_2@gmail.com' },
  { id: 21, name: 'Umar Hassan',     email: 'internal_agent_test_3@gmail.com' },
  { id: 22, name: 'Vera Morozova',   email: 'internal_lead_test_1@gmail.com' },
  { id: 23, name: 'Will Andersen',   email: 'internal_lead_test_2@gmail.com' },
  { id: 25, name: 'Yusuf Al-Rashid', email: 'internal_admin_test_1@gmail.com' },
  { id: 1,  name: 'Alice Johnson',   email: 'client_admin_test_1@gmail.com' },
  { id: 2,  name: 'Bob Chen',        email: 'client_admin_test_2@gmail.com' },
  { id: 4,  name: 'Dave Patel',      email: 'client_user_test_1@gmail.com' },
  { id: 10, name: 'Jack Nguyen',     email: 'client_admin_test_4@gmail.com' },
];

export default function CommentCompose({ ticketId, onPosted, showInternal = false }) {
  const { user } = useAuth();
  const { addToast } = useAppStore();

  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState([]);         // { file, name, uploading, id }
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState(0);
  const [mentionedIds, setMentionedIds] = useState([]);

  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  // Detect @ in textarea
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

  const mentionSuggestions = MENTION_USERS.filter(
    (u) => u.name.toLowerCase().includes(mentionQuery) || u.email.includes(mentionQuery)
  );

  function insertMention(u) {
    const before = text.slice(0, mentionPos);
    const after = text.slice(textareaRef.current.selectionStart);
    const newText = `${before}@${u.name} ${after}`;
    setText(newText);
    setMentionOpen(false);
    if (!mentionedIds.includes(u.id)) setMentionedIds((ids) => [...ids, u.id]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // File handling
  function handleFileChange(e) {
    const picked = Array.from(e.target.files);
    setFiles((prev) => [
      ...prev,
      ...picked.map((f) => ({ file: f, name: f.name, uploading: false, id: null, localUrl: URL.createObjectURL(f) })),
    ]);
    e.target.value = '';
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // Upload all pending files, return attachment ids
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
        attachment_ids,
        mentioned_user_ids: mentionedIds,
      });
    },
    onSuccess: () => {
      setText('');
      setFiles([]);
      setMentionedIds([]);
      setIsInternal(false);
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
            placeholder={`Write a comment… use @ to mention someone`}
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMentionOpen(false);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
                e.preventDefault();
                postMut.mutate();
              }
            }}
          />
          {mentionOpen && mentionSuggestions.length > 0 && (
            <div className="mention-dropdown">
              {mentionSuggestions.map((u) => (
                <button key={u.id} className="mention-item" onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}>
                  <Avatar name={u.name} size={22} />
                  <div>
                    <span className="mention-name">{u.name}</span>
                    <span className="mention-email">{u.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attached files */}
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

        {/* Toolbar */}
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
            <Button
              variant="primary" size="sm"
              disabled={!text.trim()}
              loading={postMut.isPending}
              onClick={() => postMut.mutate()}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
