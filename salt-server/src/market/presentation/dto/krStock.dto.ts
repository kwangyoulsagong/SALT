import { z } from "zod";

/** F011 · `SRV-REQ-040` — 국내 주식 조회 입력 */

/**
 * 정렬 · 순서 · 기간은 **코인 시세 표와 같은 문자열**을 받는다(화면이 같은 필터를 보낸다). 빈 문자열 = 기본:
 * 정렬 `all`(시가총액) · 기간 `realtime`(전일 대비). 순서는 `asc` 가 아니면 내림차순(코인과 같다)
 */
export const krListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z
    .enum(["", "all", "trade_value", "change", "price", "name"])
    .default("")
    .transform((v) => (v === "" ? "all" : v)),
  order: z.enum(["", "asc", "desc"]).default("desc").transform((v) => (v === "asc" ? "asc" : "desc")),
  period: z
    .enum(["", "realtime", "1d", "7d", "1m", "3m", "6m", "1y"])
    .default("")
    .transform((v) => (v === "" ? "realtime" : v)),
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
