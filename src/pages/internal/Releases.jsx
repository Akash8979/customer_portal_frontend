import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listReleases, createRelease, getRelease, updateRelease } from '../../api/releases';
import { useAI } from '../../hooks/useAI';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import { shortDate } from '../../utils/formatters';
import './Releases.css';

export default function Releases() {
  const qc = useQueryClient();
  const ai = useAI();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ version: '', title: '', is_hotfix: false, release_date: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['releases', page],
    queryFn: () => listReleases({ page, page_size: 20 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createRelease,
    onSuccess: () => { qc.invalidateQueries(['releases']); setShowCreate(false); },
  });

  const columns = [
    { key: 'version', label: 'Version', render: (v) => <span className="mono">v{v}</span> },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'is_hotfix', label: 'Type', render: (v) => v ? <Badge label="Hotfix" variant="danger" /> : <Badge label="Release" variant="info" /> },
    { key: 'release_date', label: 'Date', render: (v) => shortDate(v) },
    { key: 'feature_count', label: 'Features' },
    { key: 'bug_count', label: 'Bugs' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Releases</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ai" size="sm" onClick={() => ai.draftReleaseNotes({ version: 'next', features: [], bug_fixes: [] })}>
            ✦ Draft Release Notes
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ New Release</Button>
        </div>
      </div>

      <DataTable
        columns={columns} rows={data?.data || []} loading={isLoading}
        page={page} pageSize={20} total={data?.total || 0} onPageChange={setPage}
      />

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="New Release"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field"><label>Version</label><input placeholder="2.4.1" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} /></div>
          <div className="form-field"><label>Title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="form-field"><label>Release Date</label><input type="date" value={form.release_date} onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))} /></div>
          <div className="form-field" style={{ justifyContent: 'flex-end', paddingTop: 24 }}>
            <label><input type="checkbox" checked={form.is_hotfix} onChange={(e) => setForm((f) => ({ ...f, is_hotfix: e.target.checked }))} /> Hotfix</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
