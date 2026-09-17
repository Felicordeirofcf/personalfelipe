import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminGuard } from '../../plugins/auth.guard';
import { approveWorkoutById } from '../workout/workout.routes';

const ParamsSchema = z.object({ id: z.string().trim().min(1) });

export async function adminWorkoutRoutes(app: FastifyInstance) {
  app.patch(
    '/workouts/:id/approve',
    { preHandler: adminGuard, schema: { tags: ['Treinos'], summary: 'Aprova um treino e dispara a notificação ao aluno' } },
    async (request, reply) => {
      const parsed = ParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de treino inválido.');

      const result = await approveWorkoutById(parsed.data.id, request.log);
      if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
      return { workout: result.workout, notification: result.notification };
    },
  );
}
