import { z } from "zod";

import { PreflightMode } from "../../domain";

/**
 * `coach` 의 요청 스키마.
 *
 * 다섯 경로(`/ai-coach` · `/behavior-coach` · `/profit-plan` · `/trade-preflight` ·
 * `/signal-performance`)가 한 컨텍스트로 합쳐지면서 DTO 도 한 파일이 됐다.
 * 원문에서는 모듈마다 `*.dto.ts` 가 있었고 `mode` enum 이 **세 곳에 복사**돼 있었다.
 */

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
  outcome: z
    .enum(["unknown", "profit", "loss", "breakeven"])
    .optional()
    .default("unknown"),
  note: z.string().max(500).optional(),
});

export const explainCoachSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  koreanName: z.string().trim().min(1).max(50),
  mode: coachModeSchema,
  currentPrice: z.number().positive(),
  change24h: z.number(),
  tradeValue24h: z.number().nonnegative(),
  evidence: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        value: z.string().min(1).max(120),
      })
    )
    .min(1)
    .max(20),
  news: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        summary: z.string().max(500).optional(),
        source: z.string().max(80).optional(),
        sentiment: z.string().max(20).optional(),
      })
    )
    .max(10)
    .optional(),
});

/**
 * 주문 전 계산 입력.
 *
 * `mode` 를 도메인 enum 으로 바로 검증한다 — 문자열 리터럴을 한 번 더 적으면
 * 도메인이 값을 늘렸을 때 여기가 조용히 뒤처진다.
 */
export const tradePreflightSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  entryPrice: z.number().positive(),
  stopPrice: z.number().positive().optional(),
  takeProfitPrices: z.array(z.number().positive()).max(5).optional().default([]),
  amount: z.number().positive(),
  mode: z.nativeEnum(PreflightMode).optional().default(PreflightMode.Scalp),
});

export const profitPlanQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(20).optional(),
});

export const signalPerformanceQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(20).optional(),
  signalKey: z.string().trim().min(1).max(80).optional(),
});

export type CoachModeDto = z.infer<typeof coachModeSchema>;
export type GetCoachQueryDto = z.infer<typeof getCoachQuerySchema>;
export type GenerateCoachDto = z.infer<typeof generateCoachSchema>;
export type UpdateCoachProfileDto = z.infer<typeof updateCoachProfileSchema>;
export type CoachFeedbackDto = z.infer<typeof coachFeedbackSchema>;
export type ExplainCoachDto = z.infer<typeof explainCoachSchema>;
export type TradePreflightDto = z.infer<typeof tradePreflightSchema>;
export type ProfitPlanQueryDto = z.infer<typeof profitPlanQuerySchema>;
export type SignalPerformanceQueryDto = z.infer<
  typeof signalPerformanceQuerySchema
>;
