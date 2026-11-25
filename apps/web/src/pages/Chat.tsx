import { useEffect, useState } from 'react';
import { getWorkspaces, logout, type AuthUser, type Workspace } from '../api';
import { useTheme } from '../theme';

interface ChatProps {
  user: AuthUser;
  onSignOut: () => void;
}

type WorkspaceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; workspaces: Workspace[] };

export default function Chat({ user, onSignOut }: ChatProps) {
  const { theme, toggle } = useTheme();
  const [state, setState] = useState<WorkspaceState>({ status: 'loading' });

  useEffect(() => {
    getWorkspaces()
      .then((res) => setState({ status: 'ready', workspaces: res.workspaces }))
      .catch((err) => setState({ status: 'error', message: err instanceof Error ? err.message : 'unknown' }));
  }, []);

  async function handleSignOut() {
    await logout().catch(() => {});
    onSignOut();
  }

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-edge bg-surface md:flex">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3.5">
          <span className="font-semibold tracking-wide">Veriq</span>
          <button
            onClick={toggle}
            aria-pressed={theme === 'dark'}
            className="rounded border border-edge px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
        <WorkspaceList state={state} />
        <div className="border-t border-edge px-4 py-3">
          <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
          <p className="font-mono text-xs text-muted">{user.role}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 rounded px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-edge px-4 py-3 md:hidden">
          <span className="font-semibold tracking-wide">Veriq</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-pressed={theme === 'dark'}
              className="rounded border border-edge px-2 py-1 text-xs text-muted"
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            <button onClick={handleSignOut} className="text-xs text-muted">
              Sign out
            </button>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold text-foreground">Start an investigation</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Masukkan ID transaksi, ID customer, atau deskripsi keluhan. Setiap jawaban menyertakan
              sumber datanya dan tidak menebak.
            </p>
          </div>
        </div>
        <div className="border-t border-edge p-4">
          <form onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="complaint" className="sr-only">
              Keluhan atau ID transaksi
            </label>
            <div className="flex gap-2">
              <input
                id="complaint"
                type="text"
                disabled
                placeholder="Aktif setelah agent runtime siap"
                className="flex-1 cursor-not-allowed rounded-md border border-edge bg-surface px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent disabled:opacity-60"
              />
              <button
                type="submit"
                disabled
                className="cursor-not-allowed rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function WorkspaceList({ state }: { state: WorkspaceState }) {
  return (
    <nav aria-label="Workspaces" className="flex-1 overflow-y-auto px-2 py-2 text-sm text-muted">
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider">Workspaces</p>
      {state.status === 'loading' && <p className="px-2 py-1">Memuat workspace...</p>}
      {state.status === 'error' && (
        <p className="px-2 py-1 text-red-700 dark:text-red-400">Gagal memuat workspace: {state.message}</p>
      )}
      {state.status === 'ready' && state.workspaces.length === 0 && (
        <p className="px-2 py-1">Belum ada workspace untuk scope Anda.</p>
      )}
      {state.status === 'ready' &&
        state.workspaces.map((ws) => (
          <p key={ws.id} className="flex items-center justify-between px-2 py-1.5 text-foreground">
            <span>{ws.name}</span>
            <span className="font-mono text-xs text-muted">{ws.region}</span>
          </p>
        ))}
    </nav>
  );
}
