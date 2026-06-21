'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      // Por segurança, o backend não revela se o e-mail existe — tratamos como sucesso.
      toast.message('Se o e-mail existir, enviaremos as instruções.');
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              {sent ? <MailCheck size={28} /> : <GraduationCap size={28} />}
            </div>
            <h1 className="text-xl font-bold">{sent ? 'Verifique seu e-mail' : 'Recuperar senha'}</h1>
            <p className="mt-1 text-sm text-muted">
              {sent
                ? 'Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.'
                : 'Informe o e-mail da sua conta e enviaremos as instruções.'}
            </p>
          </div>

          {!sent && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {loading ? 'Enviando...' : 'Enviar instruções'}
              </Button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            <ArrowLeft size={15} /> Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
