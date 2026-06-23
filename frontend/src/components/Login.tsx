import { FormEvent, useState } from 'react';
import { api } from '@/api';

export default function Login({
  onLogin,
  notify,
}: {
  onLogin: () => void;
  notify: (m: string, k?: 'ok' | 'err') => void;
}) {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.login(user, password);
      notify('sesión iniciada');
      onLogin();
    } catch (e: any) {
      setErr(e.message ?? 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="card login-box" onSubmit={submit}>
        <div className="brand" style={{ fontSize: 18, marginBottom: 18 }}>
          escalia<span>·</span>docs
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Usuario</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <div className="error">{err}</div>}
        <button className="primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? '...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
