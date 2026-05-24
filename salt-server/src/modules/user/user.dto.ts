import { z } from 'zod';

export const updateProfileSchema = z.object({
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(50).optional(),
  profileImageUrl: z.string().url('Invalid URL').optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const queryPointTransactionsSchema = z.object({
  transactionType: z.enum(['earn', 'spend']).optional(),
  source: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const queryAchievementsSchema = z.object({
  achievementType: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type QueryPointTransactionsDto = z.infer<typeof queryPointTransactionsSchema>;
export type QueryAchievementsDto = z.infer<typeof queryAchievementsSchema>;
