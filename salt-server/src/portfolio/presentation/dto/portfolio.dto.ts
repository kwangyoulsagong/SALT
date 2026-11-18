import { z } from 'zod';

export const createTransactionSchema = z.object({
  // 주지 않으면 코인 — 기존 호출 그대로(F011 슬라이스 3b). 국내 주식 코드 형식 · 마스터 확인은 유스케이스
  assetType: z.enum(['crypto', 'kr_stock']).optional().default('crypto'),
  symbol: z.string().min(1, 'Symbol is required'),
  transactionType: z.enum(['buy', 'sell']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fee: z.number().min(0).optional().default(0),
  note: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
});

/**
 * 거래 수정 — 수량 · 단가 · 수수료 · 메모 · 거래일. **종목 · 자산군 · 매수/매도는 받지 않는다**(`SRV-REQ-028` FR-87 — 지우고 다시 적는다).
 * `strict` — 모르는 키(그 셋 포함)는 조용히 버리지 않고 400. 버리면 "바꿨는데 안 바뀐" 응답이 성공으로 온다
 */
export const updateTransactionSchema = z
  .object({
    quantity: z.number().positive().optional(),
    price: z.number().positive().optional(),
    fee: z.number().min(0).optional(),
    note: z.string().max(500).optional(),
    transactionDate: z.string().datetime().optional(),
  })
  .strict();

/**
 * 거래 미리보기(F006 G절 2단계 · `SRV-REQ-028` FR-85) — 두 모양. `transactionId` 가 있으면 그 거래를 고친 경우, 없으면 새 거래.
 * 메모는 계산과 무관해 받지 않는다
 */
export const previewTransactionSchema = z.union([
  updateTransactionSchema.omit({ note: true }).extend({ transactionId: z.string().min(1) }).strict(),
  createTransactionSchema.omit({ note: true }).strict(),
]);

export const queryTransactionsSchema = z.object({
  symbol: z.string().optional(),
  transactionType: z.enum(['buy', 'sell']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const queryHoldingsSchema = z.object({
  symbol: z.string().optional(),
});

/** 평가금 흐름 기간(F006 G절 FR-71) — 1주 · 1개월 · 3개월 · 1년. 주지 않으면 1개월 */
export const positionFlowQuerySchema = z.object({
  range: z.enum(['1w', '1m', '3m', '1y']).optional().default('1m'),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type PreviewTransactionDto = z.infer<typeof previewTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type QueryTransactionsDto = z.infer<typeof queryTransactionsSchema>;
export type QueryHoldingsDto = z.infer<typeof queryHoldingsSchema>;
