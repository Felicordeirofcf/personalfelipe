import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const CreateAnamnesisSchema = z
  .object({
    userId: z.string().trim().min(1),
    goal: z.string().trim().min(5).max(500),
    experience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    weeklyDays: z.number().int().min(1).max(6),
    injuries: z.array(z.string().trim().min(2).max(250)).max(10).default([]),
    availableEquip: z.string().trim().min(2).max(500),
  })
  .strict();

export async function anamnesisRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      schema: {
        tags: ['Anamnese'],
        summary: 'Salva uma nova anamnese do aluno',
      },
    },
    async (request, reply) => {
      const parsed = CreateAnamnesisSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados de anamnese inválidos.',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const student = await prisma.user.findFirst({
        where: { id: parsed.data.userId, role: 'STUDENT' },
        select: { id: true },
      });
      if (!student) {
        return reply.notFound('Aluno não encontrado.');
      }

      const anamnesis = await prisma.anamnesis.create({
        data: parsed.data,
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return reply.status(201).send({
        anamnesis: {
          id: anamnesis.id,
          userId: anamnesis.userId,
          goal: anamnesis.goal,
          experience: anamnesis.experience,
          weeklyDays: anamnesis.weeklyDays,
          injuries: anamnesis.injuries.filter(Boolean),
          availableEquip: anamnesis.availableEquip,
          createdAt: anamnesis.createdAt,
          user: { ...anamnesis.user },
        },
      });
    },
  );

  app.get(
    '/',
    {
      schema: {
        tags: ['Anamnese'],
        summary: 'Lista anamneses e informa se ainda aguardam geração de treino',
      },
    },
    async () => {
      const records = await prisma.anamnesis.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              subscriptionStatus: true,
              checkIns: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });

      const userIds = [...new Set(records.map((record) => record.userId))];
      const latestPlans = await prisma.workoutPlan.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, status: true, createdAt: true },
      });

      return {
        anamneses: records.map((record) => {
          const latestPlan = latestPlans.find((plan) => plan.userId === record.userId);
          const pending = !latestPlan || latestPlan.createdAt < record.createdAt;
          return {
            id: record.id,
            userId: record.userId,
            goal: record.goal,
            experience: record.experience,
            weeklyDays: record.weeklyDays,
            injuries: record.injuries.filter(Boolean),
            availableEquip: record.availableEquip,
            createdAt: record.createdAt,
            pending,
            user: {
              id: record.user.id,
              name: record.user.name,
              email: record.user.email,
              subscriptionStatus: record.user.subscriptionStatus,
            },
            latestCheckIn: record.user.checkIns[0]
              ? {
                  id: record.user.checkIns[0].id,
                  painLevel: record.user.checkIns[0].painLevel,
                  painLocation: record.user.checkIns[0].painLocation,
                  fatigueLevel: record.user.checkIns[0].fatigueLevel,
                  weightKg: record.user.checkIns[0].weightKg,
                  notes: record.user.checkIns[0].notes,
                  createdAt: record.user.checkIns[0].createdAt,
                }
              : null,
            latestPlan: latestPlan ? { ...latestPlan } : null,
          };
        }),
      };
    },
  );
}
