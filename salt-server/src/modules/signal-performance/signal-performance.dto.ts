import { z } from "zod";

export const signalPerformanceQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(20).optional(),
  signalKey: z.string().trim().min(1).max(80).optional(),
});

export type SignalPerformanceQueryDto = z.infer<
  typeof signalPerformanceQuerySchema
>;
