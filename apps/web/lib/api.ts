'use client';

import { API_URL } from './utils';
import { clearSession, getRefreshToken, getToken, saveSession } from './auth';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  saveSession(data);
  return true;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const token = getToken();
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const ok = await refreshTokens();
    if (ok) return request<T>(method, path, body, false);
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    let issues;
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message ?? message;
      issues = data.issues;
    } catch {
      /* corpo vazio */
    }
    throw new ApiError(res.status, message, issues);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  /** Upload com progresso real via XHR (para a barra de progresso de vídeo). */
  upload: <T>(
    path: string,
    form: FormData,
    onProgress?: (pct: number) => void,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}${path}`);
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as T));
        } else {
          let msg = `Erro ${xhr.status}`;
          try {
            msg = JSON.parse(xhr.responseText).message ?? msg;
          } catch {
            /* noop */
          }
          reject(new ApiError(xhr.status, msg));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, 'Falha de rede'));
      xhr.send(form);
    });
  },
};

export { ApiError };
export const apiBase = API_URL;
