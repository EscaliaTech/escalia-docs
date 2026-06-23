import { useState } from 'react';
import { api, DocItem, Tenant } from '@/api';

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const TYPE_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/html': 'HTML',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'application/vnd.android.package-archive': 'APK',
};

export default function DocsTable({
  docs,
  tenantById,
  showTenant,
  onChanged,
  notify,
  handleErr,
}: {
  docs: DocItem[];
  tenantById: Map<number, Tenant>;
  showTenant: boolean;
  onChanged: () => void;
  notify: (m: string, k?: 'ok' | 'err') => void;
  handleErr: (e: any) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const urlFor = (d: DocItem) => {
    const t = tenantById.get(d.tenantId);
    return t ? `https://${t.host}/${d.slug}` : `/${d.slug}`;
  };

  const toggleVisibility = async (d: DocItem) => {
    setBusyId(d.id);
    try {
      const fd = new FormData();
      fd.append('isPublic', String(!d.isPublic));
      await api.updateDoc(d.id, fd);
      notify(`"${d.slug}" → ${!d.isPublic ? 'público' : 'privado'}`);
      onChanged();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (d: DocItem) => {
    if (!confirm(`¿Borrar "${d.slug}"? No se puede deshacer.`)) return;
    setBusyId(d.id);
    try {
      await api.deleteDoc(d.id);
      notify(`"${d.slug}" borrado`);
      onChanged();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusyId(null);
    }
  };

  if (!docs.length) {
    return <p className="muted">Sin documentos.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Slug</th>
          <th>Título</th>
          {showTenant && <th>Tenant</th>}
          <th>Tipo</th>
          <th>Tamaño</th>
          <th>Visibilidad</th>
          <th className="right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {docs.map((d) => (
          <tr key={d.id}>
            <td>
              <a href={urlFor(d)} target="_blank" rel="noreferrer" className="slug">
                {d.slug}
              </a>
            </td>
            <td>{d.title || <span className="muted">—</span>}</td>
            {showTenant && <td>{tenantById.get(d.tenantId)?.name ?? d.tenantId}</td>}
            <td>{TYPE_LABEL[d.contentType] ?? d.contentType}</td>
            <td>{fmtSize(d.sizeBytes)}</td>
            <td>
              {d.isPublic ? (
                <span className="badge pub">público</span>
              ) : (
                <span className="badge priv">privado</span>
              )}
            </td>
            <td className="right">
              <button className="ghost" disabled={busyId === d.id} onClick={() => toggleVisibility(d)}>
                {d.isPublic ? 'Hacer privado' : 'Hacer público'}
              </button>{' '}
              <button className="danger" disabled={busyId === d.id} onClick={() => remove(d)}>
                Borrar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
