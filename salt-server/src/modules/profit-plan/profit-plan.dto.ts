import { z } from "zod";

export const profitPlanQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(20).optional(),
});

export type ProfitPlanQueryDto = z.infer<typeof profitPlanQuerySchema>;
