import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { normalizeCpf } from '../../lib/password';
import { adminGuard, authenticatedGuard, ensureOwnStudentResource } from '../../plugins/auth.guard';

const FeedbackSchema = z.object({ userId: z.string().min(1), fatigueLevel: z.number().int().min(1).max(10), jointPainLevel: z.number().int().min(0).max(10), loadDifficulty: z.number().int().min(1).max(10), message: z.string().trim().max(2000).optional() }).strict();
const SpreadsheetSchema = z.object({ userId: z.string().min(1), title: z.string().trim().min(2).max(160), fileUrl: z.string().url().optional(), externalUrl: z.string().url().optional() }).strict();
const UserIdSchema = z.object({ userId: z.string().min(1) });
const IdSchema = z.object({ id: z.string().min(1) });

export async function commercialRoutes(app: FastifyInstance) {
  app.post('/feedbacks', { preHandler: authenticatedGuard }, async (request, reply) => {
    const parsed = FeedbackSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Dados de feedback inválidos.');
    const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
    if (ownershipError) return ownershipError;
    const feedback = await prisma.feedback.create({ data: parsed.data });
    return reply.status(201).send({ feedback });
  });

  app.get('/feedbacks', { preHandler: adminGuard }, async () => ({
    feedbacks: await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { id: true, name: true, email: true } } } }),
  }));

  app.get('/spreadsheets/:userId', { preHandler: authenticatedGuard }, async (request, reply) => {
    const parsed = UserIdSchema.safeParse(request.params);
    if (!parsed.success) return reply.badRequest('Aluno inválido.');
    const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
    if (ownershipError) return ownershipError;

    const student = await prisma.user.findFirst({
      where: { id: parsed.data.userId, role: 'STUDENT' },
      select: { id: true, subscriptionStatus: true },
    });
    if (!student) return reply.notFound('Aluno não encontrado.');
    if (request.user.role === 'STUDENT' && student.subscriptionStatus !== 'ACTIVE') {
      return reply.status(402).send({ error: 'Ative seu acesso para visualizar as planilhas.', subscriptionStatus: student.subscriptionStatus });
    }

    return { spreadsheets: await prisma.spreadsheet.findMany({ where: { userId: student.id }, orderBy: { createdAt: 'desc' } }) };
  });

  app.post('/spreadsheets', { preHandler: adminGuard }, async (request, reply) => {
    const parsed = SpreadsheetSchema.safeParse(request.body);
    if (!parsed.success || (!parsed.data.fileUrl && !parsed.data.externalUrl)) return reply.badRequest('Informe um arquivo ou URL da planilha.');
    const spreadsheet = await prisma.spreadsheet.create({ data: parsed.data });
    return reply.status(201).send({ spreadsheet });
  });

  app.delete('/spreadsheets/:id', { preHandler: adminGuard }, async (request, reply) => {
    const parsed = IdSchema.safeParse(request.params);
    if (!parsed.success) return reply.badRequest('Planilha inválida.');
    await prisma.spreadsheet.delete({ where: { id: parsed.data.id } });
    return { deleted: true };
  });

  app.delete('/students/:id', { preHandler: adminGuard }, async (request, reply) => {
    const parsed = IdSchema.safeParse(request.params);
    if (!parsed.success) return reply.badRequest('Aluno inválido.');
    const user = await prisma.user.findFirst({ where: { id: parsed.data.id, role: 'STUDENT' }, select: { id: true } });
    if (!user) return reply.notFound('Aluno não encontrado.');
    await prisma.user.delete({ where: { id: user.id } });
    return { deleted: true };
  });

  app.patch('/students/:id', { preHandler: adminGuard }, async (request, reply) => {
    const params = IdSchema.safeParse(request.params);
    const parsed = z.object({ name: z.string().trim().min(3).optional(), email: z.string().email().optional(), cpf: z.string().optional(), gender: z.enum(['MALE', 'FEMALE']).optional(), subscriptionStatus: z.enum(['ACTIVE', 'INACTIVE', 'OVERDUE', 'CANCELED']).optional() }).strict().safeParse(request.body);
    if (!params.success || !parsed.success) return reply.badRequest('Dados de aluno inválidos.');
    const data = { ...parsed.data, ...(parsed.data.cpf ? { cpf: normalizeCpf(parsed.data.cpf) } : {}) };
    const user = await prisma.user.update({ where: { id: params.data.id }, data });
    return { user };
  });
}
