import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { adminGuard } from '../../plugins/auth.guard';

const CreateAnamnesisSchema = z
  .object({
    userId: z.string().trim().min(1),
    goal: z.string().trim().min(2).max(500),
    experience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    gender: z.enum(['MALE', 'FEMALE']).default('MALE'),
    weeklyDays: z.coerce.number().int().min(1).max(7),
    injuries: z
      .array(z.string().trim())
      .transform((arr) => arr.filter((s) => s.length > 0))
      .default([]),
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
      await request.jwtVerify();
      const parsed = CreateAnamnesisSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Dados de anamnese inválidos.',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      // Permite encontrar o aluno mesmo que esteja INACTIVE
      const student = await prisma.user.findFirst({
        where: { id: parsed.data.userId, role: 'STUDENT' },
        select: { id: true, gender: true },
      });

      if (!student) {
        return reply.notFound('Aluno não encontrado.');
      }

      if (request.user.role === 'STUDENT' && request.user.sub !== parsed.data.userId) {
        return reply.forbidden('Você só pode enviar a sua própria avaliação.');
      }

      // Salva a anamnese e atualiza gênero e updatedAt do utilizador
      const [anamnesis] = await prisma.$transaction([
        prisma.anamnesis.create({
          data: {
            userId: parsed.data.userId,
            goal: parsed.data.goal,
            experience: parsed.data.experience,
            gender: parsed.data.gender,
            weeklyDays: parsed.data.weeklyDays,
            injuries: parsed.data.injuries,
            availableEquip: parsed.data.availableEquip,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.user.update({
          where: { id: student.id },
          data: {
            gender: parsed.data.gender,
            updatedAt: new Date(),
          },
        }),
      ]);

      return reply.status(201).send({
        success: true,
        anamnesis: {
          id: anamnesis.id,
          userId: anamnesis.userId,
          goal: anamnesis.goal,
          experience: anamnesis.experience,
          gender: anamnesis.gender,
          weeklyDays: anamnesis.weeklyDays,
          injuries: anamnesis.injuries,
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
      preHandler: adminGuard,
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
            gender: record.gender,
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
