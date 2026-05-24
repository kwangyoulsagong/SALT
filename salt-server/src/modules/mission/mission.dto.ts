import { z } from 'zod';

export const createMissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  missionType: z.enum(['saving', 'investment', 'learning', 'social']),
  pointsReward: z.number().int().positive('Points must be positive'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('easy'),
});

export const updateMissionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  missionType: z.enum(['saving', 'investment', 'learning', 'social']).optional(),
  pointsReward: z.number().int().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  isActive: z.boolean().optional(),
});

export const queryMissionsSchema = z.object({
  missionType: z.enum(['saving', 'investment', 'learning', 'social']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const queryUserMissionsSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type CreateMissionDto = z.infer<typeof createMissionSchema>;
export type UpdateMissionDto = z.infer<typeof updateMissionSchema>;
export type QueryMissionsDto = z.infer<typeof queryMissionsSchema>;
export type QueryUserMissionsDto = z.infer<typeof queryUserMissionsSchema>;
