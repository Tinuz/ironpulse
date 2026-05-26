import { z } from 'zod';

/**
 * Centralised Zod validation schemas for user-generated numeric inputs.
 * Used to prevent out-of-range or malformed values from reaching the database.
 */

// ─── Workout Set ─────────────────────────────────────────────────────────────

export const WorkoutSetSchema = z.object({
  weight: z
    .number({ error: 'Gewicht moet een getal zijn' })
    .min(0, 'Gewicht mag niet negatief zijn')
    .max(500, 'Gewicht mag maximaal 500 kg zijn'),

  reps: z
    .number({ error: 'Reps moet een getal zijn' })
    .int('Reps moet een geheel getal zijn')
    .min(1, 'Reps moet minimaal 1 zijn')
    .max(100, 'Reps mag maximaal 100 zijn'),

  rir: z
    .number()
    .int()
    .min(0, 'RIR mag niet negatief zijn')
    .max(10, 'RIR mag maximaal 10 zijn')
    .optional(),

  rpe: z
    .number()
    .int()
    .min(1, 'RPE moet minimaal 1 zijn')
    .max(10, 'RPE mag maximaal 10 zijn')
    .optional(),
});

export type WorkoutSetInput = z.infer<typeof WorkoutSetSchema>;

/**
 * Stricter schema voor werksets (niet-warmup).
 * RPE en RIR zijn verplicht zodat de hypertrofie-engine voldoende data heeft.
 * Gebruik dit schema bij het valideren van het voltooien van een werkset.
 */
export const WorkingSetSchema = WorkoutSetSchema.extend({
  rir: z
    .number({ error: 'RIR is verplicht voor werksets' })
    .int('RIR moet een geheel getal zijn')
    .min(0, 'RIR mag niet negatief zijn')
    .max(10, 'RIR mag maximaal 10 zijn'),

  rpe: z
    .number({ error: 'RPE is verplicht voor werksets' })
    .int('RPE moet een geheel getal zijn')
    .min(1, 'RPE moet minimaal 1 zijn')
    .max(10, 'RPE mag maximaal 10 zijn'),
});

export type WorkingSetInput = z.infer<typeof WorkingSetSchema>;

// ─── Nutrition Log Item ──────────────────────────────────────────────────────

export const NutritionItemSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht').max(200),

  calories: z
    .number({ error: 'Calorieën moet een getal zijn' })
    .min(0, 'Calorieën mogen niet negatief zijn')
    .max(9999, 'Calorieën mogen maximaal 9999 kcal zijn'),

  protein: z
    .number()
    .min(0, 'Eiwitten mogen niet negatief zijn')
    .max(999, 'Eiwitten mogen maximaal 999 g zijn'),

  carbs: z
    .number()
    .min(0, 'Koolhydraten mogen niet negatief zijn')
    .max(999, 'Koolhydraten mogen maximaal 999 g zijn'),

  fats: z
    .number()
    .min(0, 'Vetten mogen niet negatief zijn')
    .max(999, 'Vetten mogen maximaal 999 g zijn'),

  grams: z
    .number({ error: 'Grammen moet een getal zijn' })
    .min(0, 'Grammen mogen niet negatief zijn')
    .max(9999, 'Grammen mogen maximaal 9999 g zijn')
    .optional(),
});

export type NutritionItemInput = z.infer<typeof NutritionItemSchema>;

// ─── Body Stats ──────────────────────────────────────────────────────────────

export const BodyStatsSchema = z.object({
  weight: z
    .number({ error: 'Gewicht moet een getal zijn' })
    .min(20, 'Gewicht moet minimaal 20 kg zijn')
    .max(400, 'Gewicht mag maximaal 400 kg zijn')
    .optional(),

  height: z
    .number()
    .min(100, 'Lengte moet minimaal 100 cm zijn')
    .max(250, 'Lengte mag maximaal 250 cm zijn')
    .optional(),

  age: z
    .number()
    .int()
    .min(10, 'Leeftijd moet minimaal 10 jaar zijn')
    .max(120, 'Leeftijd mag maximaal 120 jaar zijn')
    .optional(),

  chest: z.number().min(0).max(300).optional(),
  biceps: z.number().min(0).max(100).optional(),
  waist: z.number().min(0).max(300).optional(),
  thighs: z.number().min(0).max(200).optional(),
  calves: z.number().min(0).max(120).optional(),
  shoulders: z.number().min(0).max(300).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
});

export type BodyStatsInput = z.infer<typeof BodyStatsSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the first validation error message for a field, or undefined if valid.
 */
export function getFieldError<T extends object>(
  schema: z.ZodType<T>,
  data: unknown,
): string | undefined {
  const result = schema.safeParse(data);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}
