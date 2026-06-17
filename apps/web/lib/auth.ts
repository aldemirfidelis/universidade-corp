'use client';

import { UserRole } from '@uc/shared';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const TOKEN_KEY = 'uc_token';
const REFRESH_KEY = 'uc_refresh';
const USER_KEY = 'uc_user';

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function delCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function saveSession(s: Session) {
  localStorage.setItem(TOKEN_KEY, s.accessToken);
  localStorage.setItem(REFRESH_KEY, s.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(s.user));
  // Cookies leves só para o middleware decidir rota protegida / role.
  setCookie(TOKEN_KEY, s.accessToken);
  setCookie('uc_role', s.user.role);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  delCookie(TOKEN_KEY);
  delCookie('uc_role');
}

/** Home padrão por papel. */
export function homeForRole(role: UserRole): string {
  if (role === UserRole.SUPER_ADMIN) return '/platform-admin/empresas';
  if (role === UserRole.EMPLOYEE) return '/academia';
  if (role === UserRole.MANAGER) return '/gestor/dashboard';
  return '/admin/dashboard';
}
