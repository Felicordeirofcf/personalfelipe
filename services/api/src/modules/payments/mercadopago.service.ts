import { createHmac, timingSafeEqual } from 'node:crypto';
import { SubscriptionStatus } from '@prisma/client';
import { env } from '../../lib/env';

export type MercadoPagoPayment = {
  id: string | number;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  payer?: { email?: string | null; id?: string | number | null } | null;
  metadata?: { user_id?: string | null } | null;
};

export function isMercadoPagoMockMode() {
  return env.MERCADO_PAGO_ACCESS_TOKEN.trim().toLowerCase() === 'mock_token';
}

export function validateMercadoPagoSignature(input: {
  dataId: string;
  requestId?: string;
  signature?: string;
}) {
  if (isMercadoPagoMockMode() && env.MERCADO_PAGO_WEBHOOK_SECRET.trim().toLowerCase() === 'mock_secret') return true;
  if (!input.signature) return false;

  const parts = Object.fromEntries(
    input.signature.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }),
  );
  if (!parts.ts || !parts.v1 || !/^[a-f0-9]{64}$/i.test(parts.v1)) return false;

  const manifest = [
    input.dataId ? `id:${input.dataId.toLowerCase()};` : '',
    input.requestId ? `request-id:${input.requestId};` : '',
    `ts:${parts.ts};`,
  ].join('');
  const expected = createHmac('sha256', env.MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest('hex');
  const received = parts.v1;

  if (received.length !== expected.length) return false;
  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function getMercadoPagoPayment(
  paymentId: string,
  mockPayment?: MercadoPagoPayment,
): Promise<MercadoPagoPayment> {
  if (isMercadoPagoMockMode()) {
    if (!mockPayment) throw new Error('No modo mock, informe mockPayment no corpo do webhook.');
    return mockPayment;
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Consulta ao Mercado Pago retornou HTTP ${response.status}.`);
  }
  return response.json() as Promise<MercadoPagoPayment>;
}

export function mapPaymentStatus(status: string): SubscriptionStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'authorized') return SubscriptionStatus.ACTIVE;
  if (['cancelled', 'canceled', 'refunded', 'charged_back'].includes(normalized)) return SubscriptionStatus.CANCELED;
  if (normalized === 'rejected') return SubscriptionStatus.OVERDUE;
  return SubscriptionStatus.INACTIVE;
}
