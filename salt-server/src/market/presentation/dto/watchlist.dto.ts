import { z } from "zod";

/**
 * 관심 목록 DTO. **Zod 는 `presentation` 에만 있다** — `domain` 이 zod 를 import 하면
 * 훅이 막는다 (`server-architecture.md` §3).
 *
 * `assetType` 은 **DB enum 과 같은 세 값**(`crypto` · `stock` · `kr_stock`)이다 — `us_stock` 은 DB 가 모르므로 받지
 * 않는다(먼저 넓히면 DB 가 거부하는 값을 검증이 통과시킨다). `kr_stock` 은 F011 슬라이스 3(2026-10-08).
 */
export const addToWatchlistSchema = z
  .object({
    /** `kr_stock` 은 F011 슬라이스 3(2026-10-08) — DB enum 은 슬라이스 0(`DB-REQ-033`)에서 이미 넓혔다 */
    assetType: z.enum(["crypto", "stock", "kr_stock"]),
    symbol: z.string().min(1, "Symbol is required"),
    /** 국내 주식은 서버가 마스터 이름으로 덮는다 — 비워 보내도 된다 */
    name: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.assetType === "kr_stock") {
      if (!/^[0-9A-Z]{6}$/.test(value.symbol.toUpperCase())) {
        ctx.addIssue({ code: "custom", path: ["symbol"], message: "kr_stock symbol is a 6-character code" });
      }
    } else if (value.name.length === 0) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" });
    }
  });

export const queryWatchlistSchema = z.object({
  assetType: z.enum(["crypto", "stock", "kr_stock"]).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type QueryWatchlistDto = z.infer<typeof queryWatchlistSchema>;
