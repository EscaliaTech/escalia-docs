import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, DocItem, Tenant } from '@/api';
import UploadForm from '@/components/UploadForm';
import DocsTable from '@/components/DocsTable';
import TenantAdmin from '@/components/TenantAdmin';

type Selected = number | 'all';

export default function Dashboard({
  onLogout,
  notify,
  onAuthError,
}: {
  onLogout: () => void;
  notify: (m: string, k?: 'ok' | 'err') => void;
  onAuthError: () => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Selected>('all');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handle = useCallback(
    (e: any) => {
      if (e?.status === 401) onAuthError();
      else notify(e?.message ?? 'error', 'err');
    },
    [notify, onAuthError],
  );

  const loadTenants = useCallback(async () => {
    try {
      setTenants(await api.listTenants());
    } catch (e) {
      handle(e);
    }
  }, [handle]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await api.listDocs(selected === 'all' ? undefined : selected));
    } catch (e) {
      handle(e);
    } finally {
      setLoading(false);
    }
  }, [selected, handle]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);
  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const activeTenant = useMemo(
    () => (selected === 'all' ? null : tenants.find((t) => t.id === selected) ?? null),
    [selected, tenants],
  );

  const tenantById = useMemo(() => {
    const m = new Map<number, Tenant>();
    tenants.forEach((t) => m.set(t.id, t));
    return m;
  }, [tenants]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          escalia<span>·</span>docs
        </div>
        <div className="spacer" />
        <button className="ghost" onClick={onLogout}>
          Salir
        </button>
      </div>

      <div className="main">
        <div className="card">
          <h2>Tenants</h2>
          <p className="hint">Cada tenant sirve en su host. Slug único por tenant.</p>
          <div className="tenant-tabs">
            <button
              className={`tab ${selected === 'all' ? 'active' : ''}`}
              onClick={() => setSelected('all')}
            >
              Todos
            </button>
            {tenants.map((t) => (
              <button
                key={t.id}
                className={`tab ${selected === t.id ? 'active' : ''}`}
                onClick={() => setSelected(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <TenantAdmin
          tenant={activeTenant}
          onChanged={loadTenants}
          notify={notify}
          handleErr={handle}
        />

        {activeTenant && (
          <UploadForm
            tenant={activeTenant}
            onUploaded={loadDocs}
            notify={notify}
            handleErr={handle}
          />
        )}

        <div className="card">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>
              Documentos {activeTenant ? `· ${activeTenant.name}` : '· todos'}
            </h2>
            <div className="spacer" />
            <button className="ghost" onClick={loadDocs} disabled={loading}>
              {loading ? '...' : 'Refrescar'}
            </button>
          </div>
          <DocsTable
            docs={docs}
            tenantById={tenantById}
            showTenant={selected === 'all'}
            onChanged={loadDocs}
            notify={notify}
            handleErr={handle}
          />
        </div>
      </div>
    </div>
  );
}
