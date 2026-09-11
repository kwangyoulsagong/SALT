import { z } from "zod";

/**
 * 관심 목록 DTO. **Zod 는 `presentation` 에만 있다** — `domain` 이 zod 를 import 하면
 * 훅이 막는다 (`server-architecture.md` §3).
 *
 * `assetType` 이 `crypto`·`stock` 두 값인 것은 **DB enum 과 같다.** Shared Kernel 의
 * 세 값(`crypto`·`kr_stock`·`us_stock`)으로 넓히는 것은 `DB-REQ-003` 이 enum 을
 * 확장한 뒤다 — 먼저 넓히면 DB 가 거부하는 값을 검증이 통과시킨다.
 */
export const addToWatchlistSchema = z.object({
  assetType: z.enum(["crypto", "stock"]),
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
});

export const queryWatchlistSchema = z.object({
  assetType: z.enum(["crypto", "stock"]).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type QueryWatchlistDto = z.infer<typeof queryWatchlistSchema>;
