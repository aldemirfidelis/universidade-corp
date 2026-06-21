'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ShieldCheck, Award, BarChart3, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { homeForRole, saveSession, type Session } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Treinamentos & compliance', desc: 'Normas, procedimentos e validade sob controle.' },
  { icon: Award, title: 'Certificados válidos', desc: 'Emissão automática com validação pública por QR.' },
  { icon: BarChart3, title: 'Indicadores em tempo real', desc: 'Adesão, conclusão e aprovação por área.' },
];

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
    <div className="flex min-h-screen">
      {/* Painel de marca (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <GraduationCap size={22} />
          </span>
          <span className="text-lg font-semibold">Universidade Corporativa</span>
        </div>

        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles size={14} /> Plataforma de treinamento corporativo
          </div>
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Capacite suas equipes com uma experiência de aprendizado de verdade.
          </h2>
          <div className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-semibold">{h.title}</p>
                    <p className="text-sm text-white/80">{h.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-sm text-white/60">Conhecimento que transforma. Segurança que protege.</p>
      </div>

      {/* Formulário */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              <GraduationCap size={30} />
            </div>
            <h1 className="text-2xl font-bold">Universidade Corporativa</h1>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold">Entrar na plataforma</h1>
            <p className="mt-1 text-sm text-muted">Acesse seus treinamentos e certificados.</p>
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
              <div className="mb-1 flex items-center justify-between">
                <Label className="mb-0">Senha</Label>
                <Link href="/recuperar-senha" className="text-xs font-medium text-brand hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Primeiro acesso?{' '}
            <Link href="/primeiro-acesso" className="font-medium text-brand hover:underline">
              Ative sua conta
            </Link>
          </p>

          <div className="mt-6 rounded-xl border border-line bg-surface-muted/60 p-3 text-center text-xs text-muted">
            Demo: <strong>maria@goiasa.com</strong> · <strong>admin@goiasa.com</strong> · <strong>super@demo.com</strong>
            <br />
            senha <strong>123456</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
