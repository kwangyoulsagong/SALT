import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  category: z.enum(['travel', 'first_car', 'startup', 'wedding', 'creative', 'other']),
  targetAmount: z.number().positive('Target amount must be positive'),
  startDate: z.string().datetime(),
  targetDate: z.string().datetime(),
  themeColor: z.string().optional().default('#4A90E2'),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.enum(['travel', 'first_car', 'startup', 'wedding', 'creative', 'other']).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
  themeColor: z.string().optional(),
});

export const addSavingSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(200).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const queryGoalsSchema = z.object({
  status: z.enum(['active', 'completed', 'paused']).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type CreateGoalDto = z.infer<typeof createGoalSchema>;
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;
export type AddSavingDto = z.infer<typeof addSavingSchema>;
export type QueryGoalsDto = z.infer<typeof queryGoalsSchema>;
