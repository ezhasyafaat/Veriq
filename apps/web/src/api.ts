export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface Workspace {
  id: string;
  name: string;
  region: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // no body, keep the status text
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const getMe = () => api<{ user: AuthUser }>('/api/auth/me');
export const login = (email: string, password: string) =>
  api<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const logout = () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
export const getMethods = () => api<{ password: boolean; oidc: boolean }>('/api/auth/methods');
export const getWorkspaces = () => api<{ workspaces: Workspace[] }>('/api/workspaces');
