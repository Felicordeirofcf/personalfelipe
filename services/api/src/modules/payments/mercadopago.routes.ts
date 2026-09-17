import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import {
  getMercadoPagoPayment,
  isMercadoPagoMockMode,
  mapPaymentStatus,
  MercadoPagoPayment,
  validateMercadoPagoSignature,
} from './mercadopago.service';

const MockPaymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string().min(1),
  external_reference: z.string().nullable().optional(),
  transaction_amount: z.number().nullable().optional(),
  currency_id: z.string().nullable().optional(),
  payer: z.object({ email: z.string().email().nullable().optional(), id: z.union([z.string(), z.number()]).nullable().optional() }).nullable().optional(),
  metadata: z.object({ user_id: z.string().nullable().optional() }).nullable().optional(),
}).passthrough();

const WebhookSchema = z.object({
  action: z.enum(['payment.created', 'payment.updated']),
  type: z.literal('payment'),
  data: z.object({ id: z.union([z.string(), z.number()]) }),
  mockPayment: MockPaymentSchema.optional(),
}).passthrough();

const QuerySchema = z.object({
  'data.id': z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
}).passthrough();

async function findStudent(payment: MercadoPagoPayment) {
  const reference = payment.external_reference?.trim();
  const metadataUserId = payment.metadata?.user_id?.trim();
  const email = payment.payer?.email?.trim().toLowerCase();
  const customerId = payment.payer?.id ? String(payment.payer.id) : undefined;

  return prisma.user.findFirst({
    where: {
      role: 'STUDENT',
      OR: [
        ...(metadataUserId ? [{ id: metadataUserId }] : []),
        ...(reference ? [{ id: reference }, { email: reference.toLowerCase() }] : []),
        ...(email ? [{ email }] : []),
        ...(customerId ? [{ mercadoPagoCustomerId: customerId }] : []),
      ],
    },
    select: { id: true, name: true },
  });
}

export async function mercadoPagoRoutes(app: FastifyInstance) {
  app.post(
    '/mercadopago',
    { schema: { tags: ['Webhooks'], summary: 'Sincroniza o acesso do aluno a partir de pagamentos Mercado Pago' } },
    async (request, reply) => {
      const body = WebhookSchema.safeParse(request.body);
      const query = QuerySchema.safeParse(request.query);
      if (!body.success || !query.success) return reply.badRequest('Notificação Mercado Pago inválida.');

      const paymentId = String(query.data['data.id'] ?? body.data.data.id);
      const signatureHeader = request.headers['x-signature'];
      const requestIdHeader = request.headers['x-request-id'];
      const signatureIsValid = validateMercadoPagoSignature({
        dataId: paymentId,
        requestId: Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader,
        signature: Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader,
      });
      if (!signatureIsValid) return reply.status(401).send({ error: 'Assinatura do webhook inválida.' });

      let payment: MercadoPagoPayment;
      try {
        payment = await getMercadoPagoPayment(paymentId, body.data.mockPayment);
      } catch (error) {
        request.log.error({ paymentId, error }, 'Falha ao consultar pagamento no Mercado Pago.');
        return reply.status(isMercadoPagoMockMode() ? 400 : 502).send({
          error: error instanceof Error ? error.message : 'Falha ao consultar pagamento.',
        });
      }

      const student = await findStudent(payment);
      if (!student) {
        request.log.warn({ paymentId }, 'Pagamento recebido sem aluno correspondente.');
        return reply.status(200).send({ received: true, processed: false, reason: 'student_not_found' });
      }

      const subscriptionStatus = mapPaymentStatus(payment.status);
      const customerId = payment.payer?.id ? String(payment.payer.id) : undefined;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: student.id },
          data: {
            subscriptionStatus,
            ...(customerId ? { mercadoPagoCustomerId: customerId } : {}),
          },
        }),
        prisma.subscription.upsert({
          where: { externalPaymentId: String(payment.id) },
          update: {
            status: subscriptionStatus,
            externalReference: payment.external_reference ?? null,
            amount: payment.transaction_amount ?? null,
            currency: payment.currency_id ?? null,
            lastEvent: body.data.action,
          },
          create: {
            userId: student.id,
            externalPaymentId: String(payment.id),
            externalReference: payment.external_reference ?? null,
            status: subscriptionStatus,
            amount: payment.transaction_amount ?? null,
            currency: payment.currency_id ?? null,
            lastEvent: body.data.action,
          },
        }),
      ]);

      request.log.info({ paymentId, userId: student.id, subscriptionStatus }, 'Pagamento sincronizado.');
      return reply.status(200).send({ received: true, processed: true, userId: student.id, subscriptionStatus });
    },
  );
}
