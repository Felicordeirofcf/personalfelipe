import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const LoginSchema = z.object({ userId: z.string().trim().min(1) }).strict();

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/demo-login',
    {
      schema: {
        tags: ['Autenticação'],
        summary: 'Emite JWT para um usuário seed no ambiente de demonstração',
      },
    },
    async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body);
      if (!parsed.success) return reply.badRequest('Informe um userId válido.');

      const user = await prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) return reply.notFound('Usuário não encontrado.');

      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '12h' },
      );

      return { token, user: { ...user } };
    },
  );
}
