import { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticatedGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.unauthorized('Sessão inválida ou expirada.');
  }
}

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  const authError = await authenticatedGuard(request, reply);
  if (authError) return authError;

  if (request.user.role !== 'ADMIN') {
    return reply.forbidden('Acesso restrito ao administrador.');
  }
}

export function ensureOwnStudentResource(request: FastifyRequest, reply: FastifyReply, userId: string) {
  if (request.user.role === 'STUDENT' && request.user.sub !== userId) {
    return reply.forbidden('Você só pode acessar os seus próprios dados.');
  }
}
