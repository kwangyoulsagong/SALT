import { z } from "zod";

/** F011 · `SRV-REQ-040` — 국내 주식 조회 입력 */

export const krListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const krCodeParamSchema = z.object({
  code: z.string().regex(/^[0-9A-Z]{6}$/),
});

export const krChartQuerySchema = z.object({
  period: z.enum(["1d", "5m"]).default("1d"),
  count: z.coerce.number().int().min(1).max(500).default(120),
});

export const krSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(30),
});
