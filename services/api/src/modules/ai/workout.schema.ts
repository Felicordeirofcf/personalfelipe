import { z } from 'zod';

export const ExerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    sets: z.number().int().min(1).max(10),
    reps: z.string().trim().min(1).max(40),
    rir: z.number().int().min(0).max(5),
    restSeconds: z.number().int().min(15).max(600),
    cadence: z.string().trim().min(1).max(30).optional(),
    notes: z.string().trim().min(1).max(500).optional(),
    videoUrl: z.string().trim().url().max(500).optional(),
  })
  .strict();

export const SplitSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    focus: z.string().trim().min(2).max(160),
    exercises: z.array(ExerciseSchema).min(2).max(15),
  })
  .strict();

export const WorkoutPlanSchema = z
  .object({
    splits: z.array(SplitSchema).min(1).max(7),
    rationale: z.string().trim().min(20).max(4000),
  })
  .strict();

export type ExerciseInput = z.infer<typeof ExerciseSchema>;
export type SplitInput = z.infer<typeof SplitSchema>;
export type WorkoutPlanInput = z.infer<typeof WorkoutPlanSchema>;
