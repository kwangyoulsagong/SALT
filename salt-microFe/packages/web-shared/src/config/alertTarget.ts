import type { AlertTarget } from "@repo/core/alerts";

import { ROUTES } from "./routes";

/**
 * 알림 `target` 코드 → 화면 경로 — **한 곳**(`FE-REQ-031` FR-102 · `BFF-REQ-027` FR-92: BFF 는 코드만 준다).
 * 종목이 있어야 하는 칸(`invest.symbol`)에 종목이 없으면 코치 리포트로 — 없는 경로로 보내지 않는다.
 * `satisfies` 가 코드가 늘면 컴파일에서 드러나게 한다.
 */
const ALERT_TARGET_HREF = {
  "invest.symbol": (symbol: string | null) => (symbol ? ROUTES.investmentDetail(symbol) : ROUTES.coachReport),
  "invest.coach": () => ROUTES.coachReport,
  "savings.goals": () => ROUTES.goals,
  "household.board": () => ROUTES.household,
} satisfies Record<AlertTarget, (symbol: string | null) => string>;

export const alertTargetHref = (target: AlertTarget, symbol: string | null): string => ALERT_TARGET_HREF[target](symbol);
