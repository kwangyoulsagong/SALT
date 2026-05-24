import { z } from "zod";

export const coachModeSchema = z.enum(["scalp", "long_term"]);

export const getCoachQuerySchema = z.object({
  mode: coachModeSchema.optional(),
  symbol: z.string().trim().min(1).max(20).optional(),
  preview: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export const generateCoachSchema = z.object({
  mode: coachModeSchema.optional(),
  symbol: z.string().trim().min(1).max(20).optional(),
});

export const updateCoachProfileSchema = z.object({
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  maxSingleAssetWeight: z.number().min(0.05).max(1).optional(),
  rebalanceBand: z.number().min(0.01).max(0.5).optional(),
  panicSellWindowHours: z.number().int().min(1).max(168).optional(),
  defaultMode: coachModeSchema.optional(),
  notificationLevel: z.enum(["low", "medium", "high"]).optional(),
});

export const coachFeedbackSchema = z.object({
  insightId: z.string().min(1).optional(),
  symbol: z.string().trim().min(1).max(20),
  mode: coachModeSchema,
  action: z.enum(["followed", "ignored", "saved", "dismissed"]),
  outcome: z.enum(["unknown", "profit", "loss", "breakeven"]).optional().default("unknown"),
  note: z.string().max(500).optional(),
});

export type CoachMode = z.infer<typeof coachModeSchema>;
export type GetCoachQueryDto = z.infer<typeof getCoachQuerySchema>;
export type GenerateCoachDto = z.infer<typeof generateCoachSchema>;
export type UpdateCoachProfileDto = z.infer<typeof updateCoachProfileSchema>;
export type CoachFeedbackDto = z.infer<typeof coachFeedbackSchema>;
