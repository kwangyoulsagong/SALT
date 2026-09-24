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
  /** FEATURE-009 FR-27 매입가 숨김 */
  hidePurchasePrice: z.boolean().optional(),
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

/**
 * 해설 요청 — **종목과 관점뿐이다**(C01 · `SRV-REQ-025` FR-58). 시세 · 근거 · 뉴스는 서버가 조립한다.
 * 예전 본문(`currentPrice` · `evidence` · `news` …)을 보내도 Zod 가 버린다 — 옛 화면이 깨지지 않고, 그 값은 쓰이지 않는다.
 */
export const explainCoachSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  mode: coachModeSchema,
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
  /** 음수 소수(−1.5% → -0.015). 칩은 −1.5 ~ −12% 이고 상한은 −50% */
  stopLossRate: z.number().gte(-0.5).lt(0).optional(),
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
  /**
   * 있으면 **판단 스냅샷 기반 성적표 그룹**을 준다(`SRV-REQ-025` FR-15 · FR-53).
   * 없으면 기존 응답 그대로다 — 무인자 호출이 하위 호환이어야 한다.
   */
  groupBy: z.literal("signalType").optional(),
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

/** `GET /api/coach/forecast` (F008 `SRV-REQ-037`). 심볼은 코치 모양(`BTC`) */
export const forecastQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/),
});

// ==================== F009 슬라이스 1 — 사이즈 · 계획 · 리스크 예산 (`SRV-REQ-038`) ====================

const coachSymbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9]+$/);

/** 금액 · 수량 입력. NaN · 무한대 · 0 이하를 여기서 막는다(FR-8) */
const positiveAmount = z.number().finite().positive();

/** `POST /api/coach/size-check`. 금액은 원(코인 KRW 마켓) */
export const sizeCheckSchema = z
  .object({
    symbol: coachSymbolSchema,
    side: z.enum(["buy", "sell"]),
    quantity: positiveAmount,
    price: positiveAmount,
    stopPrice: positiveAmount.optional(),
    /** FR-6 — 사용자가 적은 승률(0~1 배타) · 손익비. 둘 다 있을 때만 켈리를 계산한다 */
    winRate: z.number().finite().gt(0).lt(1).optional(),
    payoffRatio: positiveAmount.optional(),
  })
  .refine((body) => (body.winRate === undefined) === (body.payoffRatio === undefined), {
    message: "winRate 와 payoffRatio 는 함께 보낸다",
    path: ["payoffRatio"],
  });

/** 예산 하나. `percent` 는 비율(0.05 = 5%)이라 1 이하 */
const budgetSettingSchema = z
  .object({
    amount: positiveAmount,
    unit: z.enum(["krw", "percent"]),
  })
  .refine((budget) => budget.unit === "krw" || budget.amount <= 1, {
    message: "percent 예산은 0~1 비율이다(0.05 = 5%)",
    path: ["amount"],
  });

/** `PUT /api/coach/risk-budget`. 빠진 필드는 그대로, `null` 은 지운다 */
export const updateRiskBudgetSchema = z.object({
  monthlyLossBudget: budgetSettingSchema.nullable().optional(),
  perTradeMaxLoss: budgetSettingSchema.nullable().optional(),
  /** 연 변동성 비율(0.15 = 15%). 0 초과 2 이하 */
  targetVolatility: z.number().finite().gt(0).lte(2).nullable().optional(),
});

const planText = z.string().trim().min(1).max(200);

/** `POST /api/coach/plans` — 종목 · 방향 말고는 전부 선택(FR-10) */
export const createTradePlanSchema = z.object({
  symbol: coachSymbolSchema,
  side: z.enum(["buy", "sell"]),
  transactionId: z.string().uuid().optional(),
  stopPrice: positiveAmount.optional(),
  targetPrice: positiveAmount.optional(),
  plannedQuantity: positiveAmount.optional(),
  thesis: planText.optional(),
  invalidation: planText.optional(),
  reviewAt: z.string().datetime({ offset: true }).optional(),
  probabilityUp: z.number().finite().min(0).max(1).optional(),
});

/** `PATCH /api/coach/plans/:id` — `null` 은 지운다. 거래 연결은 한 번뿐이라 `transactionId` 는 `null` 을 받지 않는다 */
export const updateTradePlanSchema = z.object({
  transactionId: z.string().uuid().optional(),
  stopPrice: positiveAmount.nullable().optional(),
  targetPrice: positiveAmount.nullable().optional(),
  plannedQuantity: positiveAmount.nullable().optional(),
  thesis: planText.nullable().optional(),
  invalidation: planText.nullable().optional(),
  reviewAt: z.string().datetime({ offset: true }).nullable().optional(),
  probabilityUp: z.number().finite().min(0).max(1).nullable().optional(),
});

export const tradePlanParamsSchema = z.object({ id: z.string().uuid() });

export const listTradePlansQuerySchema = z.object({
  symbol: coachSymbolSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type SizeCheckDto = z.infer<typeof sizeCheckSchema>;
export type UpdateRiskBudgetDto = z.infer<typeof updateRiskBudgetSchema>;
export type CreateTradePlanDto = z.infer<typeof createTradePlanSchema>;
export type UpdateTradePlanDto = z.infer<typeof updateTradePlanSchema>;
