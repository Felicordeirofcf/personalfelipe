import { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
}
