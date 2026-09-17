import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { adminGuard, authenticatedGuard, ensureOwnStudentResource } from '../../plugins/auth.guard';

const CreateCheckInSchema = z.object({
  userId: z.string().trim().min(1),
  painLevel: z.number().int().min(0).max(10),
  painLocation: z.string().trim().max(120).optional(),
  fatigueLevel: z.number().int().min(0).max(10),
  weightKg: z.number().min(20).max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  photoUrls: z.array(z.string().trim().url().max(500)).max(8).default([]),
}).strict();

const UserParamsSchema = z.object({ userId: z.string().trim().min(1) });

function toCheckInView(checkIn: {
  id: string;
  userId: string;
  painLevel: number;
  painLocation: string | null;
  fatigueLevel: number;
  weightKg: number | null;
  notes: string | null;
  photoUrls: string[];
  createdAt: Date;
}) {
  return {
    id: checkIn.id,
    userId: checkIn.userId,
    painLevel: checkIn.painLevel,
    painLocation: checkIn.painLocation,
    fatigueLevel: checkIn.fatigueLevel,
    weightKg: checkIn.weightKg,
    notes: checkIn.notes,
    photoUrls: checkIn.photoUrls.filter(Boolean),
    createdAt: checkIn.createdAt,
  };
}

export async function studentCheckInRoutes(app: FastifyInstance) {
  app.post(
    '/checkin',
    { preHandler: authenticatedGuard, schema: { tags: ['Check-ins'], summary: 'Registra o check-in periódico do aluno' } },
    async (request, reply) => {
      const parsed = CreateCheckInSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados de check-in inválidos.',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;

      const student = await prisma.user.findFirst({
        where: { id: parsed.data.userId, role: 'STUDENT' },
        select: { id: true },
      });
      if (!student) return reply.notFound('Aluno não encontrado.');

      const checkIn = await prisma.checkIn.create({
        data: {
          ...parsed.data,
          painLocation: parsed.data.painLocation || null,
          notes: parsed.data.notes || null,
        },
      });
      return reply.status(201).send({ checkIn: toCheckInView(checkIn) });
    },
  );
}

export async function adminCheckInRoutes(app: FastifyInstance) {
  app.get(
    '/checkins/:userId',
    { preHandler: adminGuard, schema: { tags: ['Check-ins'], summary: 'Retorna o histórico de check-ins de um aluno' } },
    async (request, reply) => {
      const parsed = UserParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de aluno inválido.');

      const student = await prisma.user.findFirst({
        where: { id: parsed.data.userId, role: 'STUDENT' },
        select: { id: true, name: true, email: true },
      });
      if (!student) return reply.notFound('Aluno não encontrado.');

      const records = await prisma.checkIn.findMany({
        where: { userId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return {
        student: { ...student },
        checkIns: records.filter((record) => Boolean(record.id)).map(toCheckInView),
      };
    },
  );
}
