import { FormEvent, useState } from 'react';
import { api, Tenant } from '@/api';

export default function TenantAdmin({
  tenant,
  onChanged,
  notify,
  handleErr,
}: {
  tenant: Tenant | null;
  onChanged: () => void;
  notify: (m: string, k?: 'ok' | 'err') => void;
  handleErr: (e: any) => void;
}) {
  const base = import.meta.env.VITE_BASE_DOMAIN ?? 'escalia.tech';
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [cred, setCred] = useState('');
  const [busy, setBusy] = useState(false);

  const host = key ? `${key}-docs.${base}` : `<key>-docs.${base}`;

  const createTenant = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createTenant({ key, host: `${key}-docs.${base}`, name });
      notify(`tenant ${key} creado`);
      setKey('');
      setName('');
      setOpen(false);
      onChanged();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  const saveCred = async () => {
    if (!tenant || !cred) return;
    setBusy(true);
    try {
      await api.setCredential(tenant.id, cred);
      notify('credencial actualizada');
      setCred('');
      onChanged();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  const clearCred = async () => {
    if (!tenant) return;
    setBusy(true);
    try {
      await api.clearCredential(tenant.id);
      notify('credencial eliminada (privados quedan inaccesibles)');
      onChanged();
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Administrar tenants</h2>
        <div className="spacer" />
        <button className="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? 'Cancelar' : '+ Nuevo tenant'}
        </button>
      </div>

      {open && (
        <form onSubmit={createTenant} style={{ marginBottom: tenant ? 18 : 0 }}>
          <div className="row">
            <div>
              <label>Key (a-z, 0-9, guiones)</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="kuai"
                required
              />
            </div>
            <div>
              <label>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kuai" required />
            </div>
            <div style={{ flex: 2 }}>
              <label>Host (auto)</label>
              <input value={host} disabled />
            </div>
            <button className="primary" disabled={busy || !key || !name}>
              Crear
            </button>
          </div>
        </form>
      )}

      {tenant && (
        <div>
          <p className="hint" style={{ marginTop: open ? 0 : -4 }}>
            Host: <span className="slug">{tenant.host}</span> · Credencial privados:{' '}
            {tenant.accessHash ? (
              <span className="badge priv">configurada</span>
            ) : (
              <span className="muted">sin configurar</span>
            )}
          </p>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>Contraseña compartida (lectores de docs privados)</label>
              <input
                type="password"
                value={cred}
                onChange={(e) => setCred(e.target.value)}
                placeholder="nueva contraseña"
              />
            </div>
            <button className="primary" onClick={saveCred} disabled={busy || !cred}>
              Guardar credencial
            </button>
            {tenant.accessHash && (
              <button className="danger" onClick={clearCred} disabled={busy}>
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
