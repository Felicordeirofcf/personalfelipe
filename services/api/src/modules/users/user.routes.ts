import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { adminGuard } from '../../plugins/auth.guard';

const QuerySchema = z.object({
  role: z.enum(['ADMIN', 'STUDENT']).optional(),
});

const SubscriptionSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
}).strict();

export async function userRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: adminGuard,
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
        select: { id: true, name: true, email: true, phone: true, role: true, gender: true, subscriptionStatus: true },
      });

      return { users: users.map((user) => ({ ...user })) };
    },
  );

  app.patch('/:id/subscription', { preHandler: adminGuard }, async (request, reply) => {
    const params = z.object({ id: z.string().trim().min(1) }).safeParse(request.params);
    const body = SubscriptionSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.badRequest('Aluno ou status de assinatura inválido.');
    }

    const student = await prisma.user.findFirst({
      where: { id: params.data.id, role: 'STUDENT' },
      select: { id: true },
    });
    if (!student) return reply.notFound('Aluno não encontrado.');

    const user = await prisma.user.update({
      where: { id: student.id },
      data: { subscriptionStatus: body.data.status },
      select: { id: true, name: true, email: true, phone: true, role: true, gender: true, subscriptionStatus: true },
    });

    return { user };
  });
}
