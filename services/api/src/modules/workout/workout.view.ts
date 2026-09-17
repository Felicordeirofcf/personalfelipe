export type LastWorkoutLog = {
  weightUsed: number;
  repsDone: number;
  rpe: number | null;
  loggedAt: Date;
};

type PlanRecord = {
  id: string;
  userId: string;
  status: string;
  rationale: string;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; name: string; email: string; phone?: string | null };
  splits: Array<{
    id: string;
    name: string;
    focus: string;
    order: number;
    exercises: Array<{
      id: string;
      name: string;
      sets: number;
      reps: string;
      rir: number;
      restSeconds: number;
      cadence: string | null;
      notes: string | null;
      videoUrl: string | null;
      order: number;
    }>;
  }>;
};

export function toWorkoutView(plan: PlanRecord, lastLogs = new Map<string, LastWorkoutLog>()) {
  return {
    id: plan.id,
    userId: plan.userId,
    status: plan.status,
    rationale: plan.rationale,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...(plan.user ? { user: { id: plan.user.id, name: plan.user.name, email: plan.user.email } } : {}),
    splits: plan.splits
      .filter((split) => Boolean(split.id))
      .map((split) => ({
        id: split.id,
        name: split.name,
        focus: split.focus,
        order: split.order,
        exercises: split.exercises
          .filter((item) => Boolean(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            sets: item.sets,
            reps: item.reps,
            rir: item.rir,
            restSeconds: item.restSeconds,
            cadence: item.cadence,
            notes: item.notes,
            videoUrl: item.videoUrl,
            order: item.order,
            lastLog: lastLogs.get(item.name) ?? null,
          })),
      })),
  };
}

export const workoutInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  splits: {
    orderBy: { order: 'asc' as const },
    include: { exercises: { orderBy: { order: 'asc' as const } } },
  },
};
