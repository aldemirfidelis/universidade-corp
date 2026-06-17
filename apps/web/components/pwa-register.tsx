'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW é opcional; ignora falhas */
      });
    }
  }, []);
  return null;
}
