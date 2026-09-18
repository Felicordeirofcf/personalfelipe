import { z } from 'zod';

export const ExerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    sets: z.coerce.number().int().min(1).max(10).default(3),
    reps: z.coerce.string().trim().min(1).max(40).default('10-12'),
    // Aceita number, null ou undefined e aplica fallback seguro
    rir: z.coerce
      .number()
      .int()
      .min(0)
      .max(5)
      .nullish()
      .transform((val) => val ?? 2),
    restSeconds: z.coerce
      .number()
      .int()
      .min(15)
      .max(600)
      .nullish()
      .transform((val) => val ?? 60),
    cadence: z
      .string()
      .trim()
      .max(30)
      .nullish()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    notes: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    videoUrl: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((val) => {
        if (!val || val.length === 0) return undefined;
        try {
          new URL(val);
          return val;
        } catch {
          return undefined;
        }
      }),
  })
  .strip();

export const SplitSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    focus: z.string().trim().min(2).max(160),
    exercises: z.array(ExerciseSchema).min(1).max(15),
  })
  .strip();

export const WorkoutPlanSchema = z
  .object({
    splits: z.array(SplitSchema).min(1).max(7),
    rationale: z
      .string()
      .trim()
      .nullish()
      .transform((val) =>
        val && val.length >= 10
          ? val
          : 'Prescrição personalizada gerada considerando o perfil biomecânico, objetivo e rotina informados.'
      ),
  })
  .strip();

export type ExerciseInput = z.infer<typeof ExerciseSchema>;
export type SplitInput = z.infer<typeof SplitSchema>;
export type WorkoutPlanInput = z.infer<typeof WorkoutPlanSchema>;
