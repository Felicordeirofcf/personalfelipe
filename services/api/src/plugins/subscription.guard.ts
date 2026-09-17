import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';

export async function activeSubscriptionGuard(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const userId = typeof params.userId === 'string' ? params.userId.trim() : '';

  if (!userId) {
    return reply.status(400).send({ error: 'Identificador de aluno inválido.' });
  }

  const student = await prisma.user.findFirst({
    where: { id: userId, role: 'STUDENT' },
    select: { id: true, subscriptionStatus: true },
  });

  if (!student) {
    return reply.status(404).send({ error: 'Aluno não encontrado.' });
  }

  if (student.subscriptionStatus !== 'ACTIVE') {
    return reply.status(402).send({
      error: 'Acesso ao treino bloqueado. Regularize a assinatura para continuar.',
      subscriptionStatus: student.subscriptionStatus,
    });
  }
}
