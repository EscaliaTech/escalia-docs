import { useCallback, useEffect, useState } from 'react';
import { getToken, clearToken } from '@/api';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';

export interface Toast {
  msg: string;
  kind: 'ok' | 'err';
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const logout = () => {
    clearToken();
    setAuthed(false);
  };

  return (
    <>
      {authed ? (
        <Dashboard onLogout={logout} notify={notify} onAuthError={() => setAuthed(false)} />
      ) : (
        <Login onLogin={() => setAuthed(true)} notify={notify} />
      )}
      {toast && <div className={`toast ${toast.kind === 'err' ? 'err' : ''}`}>{toast.msg}</div>}
    </>
  );
}
