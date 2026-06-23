import { DragEvent, FormEvent, useRef, useState } from 'react';
import { api, Tenant } from '@/api';

const ACCEPT = '.pdf,.html,.htm,.png,.jpg,.jpeg,.webp,.gif,.svg';

function slugify(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function UploadForm({
  tenant,
  onUploaded,
  notify,
  handleErr,
}: {
  tenant: Tenant;
  onUploaded: () => void;
  notify: (m: string, k?: 'ok' | 'err') => void;
  handleErr: (e: any) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    if (f && !slug) setSlug(slugify(f.name));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('tenantId', String(tenant.id));
      fd.append('slug', slug);
      if (title) fd.append('title', title);
      fd.append('isPublic', String(isPublic));
      fd.append('file', file);
      await api.createDoc(fd);
      notify(`documento "${slug}" subido`);
      setFile(null);
      setSlug('');
      setTitle('');
      setIsPublic(true);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Subir documento · {tenant.name}</h2>
      <p className="hint">
        URL final: <span className="slug">https://{tenant.host}/{slug || '<slug>'}</span>
      </p>
      <form onSubmit={submit}>
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{ marginBottom: 14 }}
        >
          {file ? (
            <span>
              <strong>{file.name}</strong> · {(file.size / 1024).toFixed(0)} KB
            </span>
          ) : (
            'Arrastrá un PDF/HTML/imagen aquí, o clic para elegir'
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="row">
          <div>
            <label>Slug (alias)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="subida-paquetes"
              required
            />
          </div>
          <div>
            <label>Título (opcional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 auto', minWidth: 0 }}>
            <label>Visibilidad</label>
            <select value={isPublic ? '1' : '0'} onChange={(e) => setIsPublic(e.target.value === '1')}>
              <option value="1">Público</option>
              <option value="0">Privado (con credencial)</option>
            </select>
          </div>
          <button className="primary" disabled={busy || !file || !slug}>
            {busy ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </form>
    </div>
  );
}
