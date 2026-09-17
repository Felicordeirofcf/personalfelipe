import { prisma } from '../../lib/prisma';
import { toWorkoutView, workoutInclude } from './workout.view';

export async function getActiveWorkoutForStudent(userId: string) {
  const [plan, anamnesis] = await Promise.all([
    prisma.workoutPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: workoutInclude,
    }),
    prisma.anamnesis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { goal: true, weeklyDays: true },
    }),
  ]);
  if (!plan) return null;

  const exerciseNames = plan.splits.flatMap((split) => split.exercises.map((exercise) => exercise.name));
  const logs = await prisma.workoutLog.findMany({
    where: { userId, exercise: { in: exerciseNames } },
    orderBy: { loggedAt: 'desc' },
    take: 500,
  });

  const lastLogs = new Map<string, { weightUsed: number; repsDone: number; rpe: number | null; loggedAt: Date }>();
  logs.forEach((log) => {
    if (!lastLogs.has(log.exercise)) {
      lastLogs.set(log.exercise, {
        weightUsed: log.weightUsed,
        repsDone: log.repsDone,
        rpe: log.rpe,
        loggedAt: log.loggedAt,
      });
    }
  });

  return {
    workout: toWorkoutView(plan, lastLogs),
    prescriptionProfile: anamnesis ?? {
      goal: 'Treino individualizado com progressão planejada',
      weeklyDays: plan.splits.length,
    },
    recentLogs: logs.slice(0, 100).map((log) => ({
      id: log.id,
      exercise: log.exercise,
      setNumber: log.setNumber,
      weightUsed: log.weightUsed,
      repsDone: log.repsDone,
      rpe: log.rpe,
      loggedAt: log.loggedAt,
    })),
  };
}
