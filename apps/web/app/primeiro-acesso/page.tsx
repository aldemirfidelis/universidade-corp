'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { homeForRole, saveSession, type Session } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';

function FirstAccessForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await api.post<Session>('/auth/first-access', {
        token,
        password,
        confirmPassword,
      });
      saveSession(session);
      toast.success('Senha criada! Bem-vindo.');
      router.replace(homeForRole(session.user.role));
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível concluir');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8">
        <h1 className="mb-1 text-2xl font-bold">Crie sua senha</h1>
        <p className="mb-6 text-sm text-muted">Defina uma senha para o seu primeiro acesso.</p>
        {!token ? (
          <p className="text-sm text-danger">Link inválido. Solicite um novo convite ao RH.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label>Confirme a senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Salvando...' : 'Criar senha e entrar'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function FirstAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="text-muted">Carregando...</div>}>
        <FirstAccessForm />
      </Suspense>
    </div>
  );
}
