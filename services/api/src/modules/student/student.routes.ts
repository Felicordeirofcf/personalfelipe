import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticatedGuard, ensureOwnStudentResource } from '../../plugins/auth.guard';
import { activeSubscriptionGuard } from '../../plugins/subscription.guard';
import { getActiveWorkoutForStudent } from '../workout/workout.service';

const UserParamsSchema = z.object({ userId: z.string().trim().min(1) });

export async function studentWorkoutRoutes(app: FastifyInstance) {
  app.get(
    '/active-workout/:userId',
    {
      preHandler: [authenticatedGuard, activeSubscriptionGuard],
      schema: {
        tags: ['Treinos'],
        summary: 'Retorna o treino ativo com a última execução de cada exercício',
      },
    },
    async (request, reply) => {
      const parsed = UserParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de aluno inválido.');

      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;

      const result = await getActiveWorkoutForStudent(parsed.data.userId);
      if (!result) return reply.notFound('O aluno ainda não possui um treino ativo.');
      return result;
    },
  );

  app.post('/workout/complete', { preHandler: authenticatedGuard }, async (request, reply) => {
    const body = request.body as { userId?: string; workoutId?: string; dayTitle?: string };
    if (!body.userId || !body.dayTitle) return reply.badRequest('Informe o aluno e o título do treino.');
    const ownershipError = ensureOwnStudentResource(request, reply, body.userId);
    if (ownershipError) return ownershipError;
    const session = await prisma.workoutSession.create({ data: { userId: body.userId, workoutId: body.workoutId, dayTitle: body.dayTitle } });
    return reply.status(201).send({ session });
  });

  app.get('/attendance/:userId', { preHandler: authenticatedGuard }, async (request, reply) => {
    const parsed = UserParamsSchema.safeParse(request.params);
    if (!parsed.success) return reply.badRequest('Identificador de aluno inválido.');
    const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
    if (ownershipError) return ownershipError;
    const sessions = await prisma.workoutSession.findMany({ where: { userId: parsed.data.userId }, orderBy: { completedAt: 'desc' }, take: 90 });
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const days = new Set(sessions.map((session) => session.completedAt.toISOString().slice(0, 10)));
    let currentStreak = 0; const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    while (days.has(cursor.toISOString().slice(0, 10))) { currentStreak += 1; cursor.setDate(cursor.getDate() - 1); }
    return { monthlyDays: new Set(sessions.filter((session) => session.completedAt.getMonth() === now.getMonth() && session.completedAt.getFullYear() === now.getFullYear()).map((session) => session.completedAt.toISOString().slice(0, 10))).size, weeklyTarget: 7, completedThisWeek: sessions.filter((session) => session.completedAt >= startOfWeek).length, currentStreak, sessions };
  });
}
