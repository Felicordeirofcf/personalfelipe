import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticatedGuard } from '../../plugins/auth.guard';
import { env } from '../../lib/env';
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
  payer: z.object({
    email: z.string().email().nullable().optional(),
    id: z.union([z.string(), z.number()]).nullable().optional(),
  }).nullable().optional(),
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
    '/checkout',
    {
      preHandler: authenticatedGuard,
      schema: { tags: ['Pagamentos'], summary: 'Cria checkout de planilha personalizada por R$ 40,00' },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) return reply.notFound('Aluno não encontrado.');

      // Garante o domínio correto de produção sem cair em domínios legados
      const configuredOrigin = env.WEB_ORIGIN?.split(',')[0]?.trim();
      const origin =
        configuredOrigin && !configuredOrigin.includes('felipepersonal.com')
          ? configuredOrigin
          : 'https://evotrainer.com.br';

      const accessToken = env.MP_ACCESS_TOKEN ?? env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken || accessToken === 'mock_secret' || accessToken.trim() === '') {
        request.log.error('MP_ACCESS_TOKEN não está definido no ambiente da API.');
        return reply.status(500).send({
          error: 'Serviço de pagamentos indisponível. Credencial do Mercado Pago não configurada.',
        });
      }

      const preferencePayload = {
        items: [
          {
            title: 'Planilha de Treino Personalizada - ConsultoriaFit',
            quantity: 1,
            unit_price: 40.0,
            currency_id: 'BRL',
          },
        ],
        external_reference: user.id,
        payer: {
          name: user.name,
          email: user.email,
        },
        back_urls: {
          success: `${origin}/anamnese?payment=success`,
          failure: `${origin}/cadastro?payment=failure`,
          pending: `${origin}/anamnese?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${(env.API_PUBLIC_URL ?? origin).replace(/\/$/, '')}/api/webhooks/mercadopago`,
      };

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        request.log.error({ status: response.status, errorBody }, 'Falha na resposta da API Mercado Pago');
        return reply.status(502).send({
          error: 'Não foi possível gerar a preferência de pagamento no Mercado Pago.',
          details: errorBody,
        });
      }

      const preference = (await response.json()) as {
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      };

      await prisma.payment.create({
        data: {
          userId: user.id,
          mpPreferenceId: preference.id,
          status: 'pending',
          amount: 40.0,
        },
      });

      const initPoint = preference.init_point ?? preference.sandbox_init_point;
      if (!initPoint) {
        return reply.status(502).send({ error: 'Mercado Pago não retornou URL de pagamento.' });
      }

      return reply.send({ initPoint });
    }
  );

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
        return reply.status(502).send({
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
        prisma.payment.upsert({
          where: { mpPaymentId: String(payment.id) },
          update: {
            status: subscriptionStatus === 'ACTIVE' ? 'approved' : payment.status,
            amount: payment.transaction_amount ?? 40,
          },
          create: {
            userId: student.id,
            mpPaymentId: String(payment.id),
            status: subscriptionStatus === 'ACTIVE' ? 'approved' : payment.status,
            amount: payment.transaction_amount ?? 40,
          },
        }),
      ]);

      request.log.info({ paymentId, userId: student.id, subscriptionStatus }, 'Pagamento sincronizado.');
      return reply.status(200).send({ received: true, processed: true, userId: student.id, subscriptionStatus });
    }
  );
}

export const paymentRoutes = mercadoPagoRoutes;
