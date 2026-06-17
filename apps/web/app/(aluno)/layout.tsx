'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Home, BookOpen, Award, LogOut, HelpCircle, Building2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth-context';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/academia', label: 'Academia', icon: Building2 },
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/meus-treinamentos', label: 'Meus Treinamentos', icon: BookOpen },
  { href: '/meus-certificados', label: 'Meus Certificados', icon: Award },
  { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/inicio" className="flex items-center gap-2">
            {me?.branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.branding.logoUrl} alt="logo" className="h-8 w-auto" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <GraduationCap size={18} />
              </span>
            )}
            <span className="font-semibold">{me?.branding?.universityName ?? 'Universidade'}</span>
          </Link>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">{children}</main>

      {/* Navegação inferior fixa (mobile-first, botões grandes) */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs',
                  active ? 'text-brand' : 'text-slate-500',
                )}
              >
                <Icon size={22} />
                <span className="hidden sm:block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
