import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

// Aceita userId OU email e tolera campos adicionais (como password vindo do formulário)
const LoginSchema = z.object({
  userId: z.string().trim().optional(),
  email: z.string().email().trim().optional(),
  password: z.string().optional(),
});

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
      if (!parsed.success) {
        return reply.badRequest('Informe um userId ou email válido.');
      }

      const { userId, email } = parsed.data;

      if (!userId && !email) {
        return reply.badRequest('Informe um userId ou email válido.');
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!user) {
        return reply.notFound('Usuário não encontrado.');
      }

      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '12h' },
      );

      return { token, user: { ...user } };
    },
  );
}
