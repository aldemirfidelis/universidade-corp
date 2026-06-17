'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { homeForRole, saveSession, type Session } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await api.post<Session>('/auth/login', { identifier, password });
      saveSession(session);
      toast.success(`Bem-vindo, ${session.user.name}!`);
      router.replace(homeForRole(session.user.role));
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
              <GraduationCap size={30} />
            </div>
            <h1 className="text-2xl font-bold">Universidade Corporativa</h1>
            <p className="text-sm text-slate-500">Acesse seus treinamentos</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>E-mail, CPF ou matrícula</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
                required
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">
            Demo: <strong>maria@goiasa.com</strong> / <strong>123456</strong> (funcionário)
            <br />
            <strong>admin@goiasa.com</strong> · <strong>super@demo.com</strong> · senha 123456
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
