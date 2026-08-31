'use client';
import { useEffect } from 'react';

declare global { interface Window { fbq?: (...args: unknown[]) => void; } }

export default function MetaPurchase({ orderId, value = 97 }: { orderId?: string; value?: number }) {
  useEffect(() => {
    if (typeof window.fbq !== 'function' || !orderId) return;
    window.fbq('track', 'Purchase', { value, currency: 'BRL', content_name: 'Planilha de treino EVOTrainer' }, { eventID: orderId });
  }, [orderId, value]);
  return null;
}
