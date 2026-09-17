import { FastifyBaseLogger } from 'fastify';
import { env } from '../../lib/env';

type ApprovedWorkoutNotification = {
  name: string;
  phone: string | null;
};

type DeliveryResult = {
  mode: 'webhook' | 'structured-log';
  delivered: boolean;
};

function isMockConfiguration() {
  return env.WHATSAPP_API_KEY.trim().toLowerCase() === 'mock_key';
}

export async function sendWorkoutApprovedWhatsApp(
  recipient: ApprovedWorkoutNotification,
  logger: FastifyBaseLogger,
): Promise<DeliveryResult> {
  const appUrl = env.WEB_ORIGIN.split(',')[0]?.trim().replace(/\/$/, '') || 'http://localhost:3000';
  const message = `Olá, ${recipient.name}! Seu novo treino foi chancelado pelo seu personal e já está disponível no app: ${appUrl}/treino`;

  if (!recipient.phone || isMockConfiguration()) {
    logger.info(
      {
        event: 'workout.approved.whatsapp',
        delivery: 'structured-log',
        recipient: recipient.phone ?? 'telefone-nao-cadastrado',
        message,
      },
      'Notificação de WhatsApp registrada em fallback local.',
    );
    return { mode: 'structured-log', delivered: false };
  }

  try {
    const response = await fetch(env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.WHATSAPP_API_KEY}`,
        apikey: env.WHATSAPP_API_KEY,
      },
      body: JSON.stringify({ phone: recipient.phone, message }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Provedor respondeu HTTP ${response.status}.`);
    }

    logger.info(
      { event: 'workout.approved.whatsapp', delivery: 'webhook', recipient: recipient.phone },
      'Notificação de treino aprovado enviada.',
    );
    return { mode: 'webhook', delivered: true };
  } catch (error) {
    logger.warn(
      {
        event: 'workout.approved.whatsapp',
        delivery: 'structured-log',
        recipient: recipient.phone,
        message,
        error: error instanceof Error ? error.message : 'erro desconhecido',
      },
      'Falha no provedor de WhatsApp; aprovação mantida e fallback registrado.',
    );
    return { mode: 'structured-log', delivered: false };
  }
}
