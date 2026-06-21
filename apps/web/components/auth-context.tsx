'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@uc/shared';
import { api } from '@/lib/api';
import { clearSession, getUser } from '@/lib/auth';

interface Branding {
  universityName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  // Conteúdo white-label opcional (populado via CompanySettings na Fase 2).
  coverUrl?: string | null;
  heroTitle?: string | null;
  aboutText?: string | null;
  mission?: string | null;
  vision?: string | null;
  guidelines?: string[] | null;
}

interface Me {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  department: string | null;
  position: string | null;
  branding: Branding | null;
}

interface AuthCtx {
  me: Me | null;
  loading: boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ me: null, loading: true, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = getUser();
    if (!local) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    api
      .get<Me>('/auth/me')
      .then((data) => {
        setMe(data);
        applyBranding(data.branding);
      })
      .catch(() => {
        clearSession();
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  return <Ctx.Provider value={{ me, loading, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

function applyBranding(b: Branding | null) {
  if (!b) return;
  const root = document.documentElement;
  root.style.setProperty('--brand', b.primaryColor);
  root.style.setProperty('--brand-dark', b.secondaryColor);
}
