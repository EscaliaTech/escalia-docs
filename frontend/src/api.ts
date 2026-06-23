const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3010';
const TOKEN_KEY = 'escalia_admin_token';

export interface Tenant {
  id: number;
  key: string;
  host: string;
  name: string;
  accessHash: string | null;
}

export interface DocItem {
  id: number;
  tenantId: number;
  slug: string;
  title: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, 'sesión expirada');
  }
  if (!res.ok) {
    let msg = `error ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? msg;
    } catch {
      /* noop */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  async login(user: string, password: string): Promise<string> {
    const res = await fetch(`${BASE}/admin/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    });
    if (!res.ok) throw new ApiError(res.status, 'credenciales inválidas');
    const { token } = await res.json();
    setToken(token);
    return token;
  },

  listTenants: () => req<Tenant[]>('/admin/api/tenants'),

  createTenant: (data: { key: string; host: string; name: string }) =>
    req<Tenant>('/admin/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  setCredential: (id: number, password: string) =>
    req<{ ok: true }>(`/admin/api/tenants/${id}/credential`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),

  clearCredential: (id: number) =>
    req<{ ok: true }>(`/admin/api/tenants/${id}/credential`, { method: 'DELETE' }),

  listDocs: (tenantId?: number) =>
    req<DocItem[]>(`/admin/api/docs${tenantId ? `?tenantId=${tenantId}` : ''}`),

  createDoc: (form: FormData) =>
    req<DocItem>('/admin/api/docs', { method: 'POST', body: form }),

  updateDoc: (id: number, form: FormData) =>
    req<DocItem>(`/admin/api/docs/${id}`, { method: 'PUT', body: form }),

  deleteDoc: (id: number) =>
    req<{ ok: true }>(`/admin/api/docs/${id}`, { method: 'DELETE' }),
};
