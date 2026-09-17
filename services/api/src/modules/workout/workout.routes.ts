import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { adminGuard, authenticatedGuard, ensureOwnStudentResource } from '../../plugins/auth.guard';
import { activeSubscriptionGuard } from '../../plugins/subscription.guard';
import { AiGenerationError, generateWorkoutPlan } from '../ai/ai.service';
import { WorkoutPlanSchema } from '../ai/workout.schema';
import { sendWorkoutApprovedWhatsApp } from '../notifications/whatsapp.service';
import { getActiveWorkoutForStudent } from './workout.service';
import { toWorkoutView, workoutInclude } from './workout.view';

const GenerateWorkoutSchema = z.object({
  anamnesisId: z.string().trim().min(1).optional(),
  studentId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  methodology: z.string().trim().min(1).optional(),
  previousExercises: z.array(z.string().trim().min(2).max(120)).max(100).optional(),
  level: z.string().optional(),
  goal: z.string().optional(),
  excludeExerciseNames: z.array(z.string().trim().min(2).max(120)).max(100).optional(),
}).passthrough();
const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const StudentParamsSchema = z.object({ userId: z.string().trim().min(1) });
const SessionSchema = z.object({ userId: z.string().trim().min(1), workoutId: z.string().trim().min(1).optional(), dayTitle: z.string().trim().min(2).max(120) }).strict();
const ListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  userId: z.string().trim().min(1).optional(),
});
const WorkoutLogSchema = z
  .object({
    userId: z.string().trim().min(1),
    exercise: z.string().trim().min(2).max(120),
    setNumber: z.number().int().min(1).max(20),
    weightUsed: z.number().min(0).max(2000).nullable().optional(),
    repsDone: z.number().int().min(0).max(1000).nullable().optional(),
    rpe: z.number().min(0).max(10).optional(),
  })
  .strict();

export async function approveWorkoutById(id: string, logger: FastifyBaseLogger) {
  const current = await prisma.workoutPlan.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!current) return { ok: false as const, statusCode: 404 as const, error: 'Treino não encontrado.' };
  if (current.status !== 'DRAFT') {
    return { ok: false as const, statusCode: 409 as const, error: 'Somente um treino em rascunho pode ser aprovado.' };
  }

  const active = await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.updateMany({
      where: { userId: current.userId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
    const published = await tx.workoutPlan.update({
      where: { id: current.id },
      data: { status: 'ACTIVE' },
      include: workoutInclude,
    });
    await tx.user.update({ where: { id: current.userId }, data: { subscriptionStatus: 'ACTIVE' } });
    return published;
  });

  const notification = await sendWorkoutApprovedWhatsApp(
    { name: active.user.name, phone: active.user.phone },
    logger,
  );
  return { ok: true as const, workout: toWorkoutView(active), notification };
}

export async function workoutRoutes(app: FastifyInstance) {
  app.post(
    '/generate',
    {
      preHandler: adminGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Gera um treino com OpenAI ou fallback local e salva como rascunho',
      },
    },
    async (request, reply) => {
      const parsed = GenerateWorkoutSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.badRequest('Informe um anamnesisId válido ou selecione um aluno com anamnese preenchida.');
      }

      let targetAnamnesisId = parsed.data.anamnesisId;
      const targetStudentId = parsed.data.studentId ?? parsed.data.userId;
      if (!targetAnamnesisId && targetStudentId) {
        const latestAnamnesis = await prisma.anamnesis.findFirst({
          where: { userId: targetStudentId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        targetAnamnesisId = latestAnamnesis?.id;
      }
      if (!targetAnamnesisId) {
        return reply.badRequest('Informe um anamnesisId válido ou selecione um aluno com anamnese preenchida.');
      }

      const anamnesis = await prisma.anamnesis.findUnique({
        where: { id: targetAnamnesisId },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!anamnesis) {
        return reply.notFound('Anamnese não encontrada.');
      }

      try {
        const previousExercises = parsed.data.previousExercises ?? parsed.data.excludeExerciseNames ?? [];
        const { plan, mode } = await generateWorkoutPlan(anamnesis, previousExercises, parsed.data.methodology);
        const saved = await prisma.$transaction(async (tx) => {
          await tx.workoutPlan.updateMany({
            where: { userId: anamnesis.userId, status: 'DRAFT' },
            data: { status: 'ARCHIVED' },
          });

          return tx.workoutPlan.create({
            data: {
              userId: anamnesis.userId,
              status: 'DRAFT',
              rationale: plan.rationale,
              splits: {
                create: plan.splits.map((split, splitIndex) => ({
                  name: split.name,
                  focus: split.focus,
                  order: splitIndex + 1,
                  exercises: {
                    create: split.exercises.map((item, exerciseIndex) => ({
                      name: item.name,
                      sets: item.sets,
                      reps: item.reps,
                      rir: item.rir,
                      restSeconds: item.restSeconds,
                      cadence: item.cadence,
                      notes: item.notes,
                      videoUrl: item.videoUrl,
                      order: exerciseIndex + 1,
                    })),
                  },
                })),
              },
            },
            include: workoutInclude,
          });
        });

        return reply.status(201).send({ workout: toWorkoutView(saved), generationMode: mode });
      } catch (error) {
        if (error instanceof AiGenerationError) {
          request.log.error({ error: error.details }, error.message);
          return reply.status(502).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/',
    {
      preHandler: adminGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Lista planos para o painel do personal',
      },
    },
    async (request, reply) => {
      const parsed = ListQuerySchema.safeParse(request.query);
      if (!parsed.success) return reply.badRequest('Filtros inválidos.');

      const plans = await prisma.workoutPlan.findMany({
        where: {
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
          ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: workoutInclude,
      });

      return { workouts: plans.map((plan) => toWorkoutView(plan)) };
    },
  );

  app.put(
    '/:id',
    {
      preHandler: adminGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Atualiza integralmente um treino em rascunho',
      },
    },
    async (request, reply) => {
      const params = ParamsSchema.safeParse(request.params);
      const body = WorkoutPlanSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.status(400).send({
          error: 'Treino inválido.',
          details: body.success ? undefined : body.error.flatten().fieldErrors,
        });
      }

      const current = await prisma.workoutPlan.findUnique({
        where: { id: params.data.id },
        select: { id: true, status: true },
      });
      if (!current) return reply.notFound('Treino não encontrado.');
      if (current.status !== 'DRAFT') {
        return reply.conflict('Somente treinos em rascunho podem ser editados.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.split.deleteMany({ where: { workoutPlanId: current.id } });
        return tx.workoutPlan.update({
          where: { id: current.id },
          data: {
            rationale: body.data.rationale,
            splits: {
              create: body.data.splits.map((split, splitIndex) => ({
                name: split.name,
                focus: split.focus,
                order: splitIndex + 1,
                exercises: {
                  create: split.exercises.map((item, exerciseIndex) => ({
                    name: item.name,
                    sets: item.sets,
                    reps: item.reps,
                    rir: item.rir,
                    restSeconds: item.restSeconds,
                    cadence: item.cadence,
                    notes: item.notes,
                    videoUrl: item.videoUrl,
                    order: exerciseIndex + 1,
                  })),
                },
              })),
            },
          },
          include: workoutInclude,
        });
      });

      return { workout: toWorkoutView(updated) };
    },
  );

  app.delete(
    '/:id',
    { preHandler: adminGuard, schema: { tags: ['Treinos'], summary: 'Exclui um plano e seus exercícios' } },
    async (request, reply) => {
      const parsed = ParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de treino inválido.');
      const current = await prisma.workoutPlan.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
      if (!current) return reply.notFound('Treino não encontrado.');
      await prisma.workoutPlan.delete({ where: { id: current.id } });
      return reply.status(204).send();
    },
  );

  app.patch(
    '/:id/approve',
    {
      preHandler: adminGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Aprova o rascunho e o torna o único treino ativo do aluno',
      },
    },
    async (request, reply) => {
      const parsed = ParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de treino inválido.');

      const result = await approveWorkoutById(parsed.data.id, request.log);
      if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
      return { workout: result.workout, notification: result.notification };
    },
  );

  app.post(
    '/log',
    {
      preHandler: authenticatedGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Registra carga, repetições e esforço percebido de uma série',
      },
    },
    async (request, reply) => {
      const parsed = WorkoutLogSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Registro da série inválido.',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;

      const activeStudent = await prisma.user.findFirst({
        where: { id: parsed.data.userId, role: 'STUDENT', subscriptionStatus: 'ACTIVE' },
        select: { id: true },
      });
      if (!activeStudent) {
        return reply.status(402).send({ error: 'Acesso ao treino bloqueado. Ative a assinatura para continuar.' });
      }

      const exerciseExists = await prisma.splitExercise.findFirst({
        where: {
          name: parsed.data.exercise,
          split: {
            workoutPlan: { userId: parsed.data.userId, status: 'ACTIVE' },
          },
        },
        select: { id: true },
      });
      if (!exerciseExists) {
        return reply.notFound('Exercício não encontrado no treino ativo do aluno.');
      }

      const log = await prisma.workoutLog.create({ data: { ...parsed.data, weightUsed: parsed.data.weightUsed ?? 0, repsDone: parsed.data.repsDone ?? 0 } });
      return reply.status(201).send({
        log: {
          id: log.id,
          userId: log.userId,
          exercise: log.exercise,
          setNumber: log.setNumber,
          weightUsed: log.weightUsed,
          repsDone: log.repsDone,
          rpe: log.rpe,
          loggedAt: log.loggedAt,
        },
      });
    },
  );

  app.post(
    '/sessions',
    { preHandler: authenticatedGuard, schema: { tags: ['Treinos'], summary: 'Registra a conclusão de um dia de treino' } },
    async (request, reply) => {
      const parsed = SessionSchema.safeParse(request.body);
      if (!parsed.success) return reply.badRequest('Dados da sessão inválidos.');
      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;
      const activeStudent = await prisma.user.findFirst({ where: { id: parsed.data.userId, role: 'STUDENT', subscriptionStatus: 'ACTIVE' }, select: { id: true } });
      if (!activeStudent) return reply.status(402).send({ error: 'Acesso ao treino bloqueado.' });
      const session = await prisma.workoutSession.create({ data: parsed.data });
      return reply.status(201).send({ session });
    },
  );

  app.get(
    '/sessions/:userId',
    { preHandler: authenticatedGuard, schema: { tags: ['Treinos'], summary: 'Retorna o calendário de sessões do aluno' } },
    async (request, reply) => {
      const parsed = StudentParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de aluno inválido.');
      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;
      const sessions = await prisma.workoutSession.findMany({ where: { userId: parsed.data.userId }, orderBy: { completedAt: 'desc' }, take: 90 });
      return { sessions };
    },
  );

  app.patch(
    '/:id/publish',
    {
      preHandler: adminGuard,
      schema: {
        tags: ['Treinos'],
        summary: 'Publica e libera explicitamente um treino revisado para o aluno',
      },
    },
    async (request, reply) => {
      const parsed = ParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de treino inválido.');

      const result = await approveWorkoutById(parsed.data.id, request.log);
      if (!result.ok) return reply.status(result.statusCode).send({ error: result.error });
      return reply.status(200).send({ workout: result.workout, notification: result.notification });
    },
  );

  app.get(
    '/student/:userId',
    {
      preHandler: [authenticatedGuard, activeSubscriptionGuard],
      schema: {
        tags: ['Treinos'],
        summary: 'Retorna o treino ativo e os registros recentes do aluno',
      },
    },
    async (request, reply) => {
      const parsed = StudentParamsSchema.safeParse(request.params);
      if (!parsed.success) return reply.badRequest('Identificador de aluno inválido.');

      const ownershipError = ensureOwnStudentResource(request, reply, parsed.data.userId);
      if (ownershipError) return ownershipError;

      const result = await getActiveWorkoutForStudent(parsed.data.userId);
      if (!result) return reply.notFound('O aluno ainda não possui um treino ativo.');
      return result;
    },
  );
}
