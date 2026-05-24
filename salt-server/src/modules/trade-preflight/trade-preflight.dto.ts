import { z } from "zod";

export const tradePreflightSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  entryPrice: z.number().positive(),
  stopPrice: z.number().positive().optional(),
  takeProfitPrices: z.array(z.number().positive()).max(5).optional().default([]),
  amount: z.number().positive(),
  mode: z.enum(["scalp", "long_term"]).optional().default("scalp"),
});

export type TradePreflightDto = z.infer<typeof tradePreflightSchema>;
