import { useEffect, useState, type FormEvent } from 'react';
import { getMethods, login, type AuthUser } from '../api';

interface LoginProps {
  onSignIn: (user: AuthUser) => void;
}

export default function Login({ onSignIn }: LoginProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);

  useEffect(() => {
    getMethods()
      .then((m) => setOidcEnabled(m.oidc))
      .catch(() => setOidcEnabled(false));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const res = await login(String(form.get('email')), String(form.get('password')));
      onSignIn(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-2 inline-flex h-9 items-center rounded-md bg-surface px-3 font-semibold tracking-wide text-foreground">
            Veriq
          </div>
          <h1 className="text-xl font-semibold text-foreground">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-muted">Support Investigation Assistant</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-edge bg-surface px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-edge bg-surface px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent"
              placeholder="Password Anda"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {oidcEnabled && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-edge" />
              atau
              <span className="h-px flex-1 bg-edge" />
            </div>
            <a
              href="/api/auth/oidc/login"
              className="block w-full rounded-md border border-edge bg-surface py-2 text-center text-sm font-semibold text-foreground transition-colors hover:border-accent"
            >
              Sign in with SSO
            </a>
          </>
        )}
      </div>
    </main>
  );
}
