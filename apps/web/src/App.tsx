import { useEffect, useState } from 'react';
import { getMe, type AuthUser } from './api';
import { usePath } from './router';
import Chat from './pages/Chat';
import Landing from './pages/Landing';
import Login from './pages/Login';

export default function App() {
  const path = usePath();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Memuat sesi...</p>
      </main>
    );
  }

  if (user) {
    return <Chat user={user} onSignOut={() => setUser(null)} />;
  }

  if (path === '/login') {
    return <Login onSignIn={setUser} />;
  }

  return <Landing />;
}
