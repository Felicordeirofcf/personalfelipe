import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const QuerySchema = z.object({
  role: z.enum(['ADMIN', 'STUDENT']).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Lista usuários disponíveis para os fluxos de demonstração',
      },
    },
    async (request, reply) => {
      const parsed = QuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.badRequest('Filtro de usuário inválido.');
      }

      const users = await prisma.user.findMany({
        where: parsed.data.role ? { role: parsed.data.role } : undefined,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, phone: true, role: true, subscriptionStatus: true },
      });

      return { users: users.map((user) => ({ ...user })) };
    },
  );
}
