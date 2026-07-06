'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_18%_0%,hsl(var(--brand)/0.10),transparent_28%),hsl(var(--background))] px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl font-bold uppercase tracking-[-0.04em] leading-none">
            <span className="text-brand">IN</span>MOVE
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Centro de evaluacion y rendimiento</p>
        </div>

        <form onSubmit={handleSubmit} className="surface-1 rounded-lg p-6">
          <h1 className="text-xl font-semibold">Ingreso de administrador</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accede para gestionar deportistas y fichas.</p>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-semibold text-muted-foreground">Correo</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@inmove.co"
              className="field-control"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-muted-foreground">Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field-control"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-sm border border-level-danger/40 bg-level-danger/10 px-3 py-2 text-sm text-level-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-6 w-full">
            <LogIn />
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
