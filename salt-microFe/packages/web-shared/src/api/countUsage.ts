import { INVESTMENTS_BASE_URL } from "../config";
import { apiFetch } from "./apiFetch";
import { hasSession } from "./session";

/** `POST /api/app/me/usage` — 도메인 사용 계측(`FE-REQ-055` FR-8 · `BFF-REQ-046` FR-10 · 서버 S3d `SRV-REQ-048` FR-7) */
export const USAGE_ENDPOINT = "/api/app/me/usage";

export type UsageKind = "visit" | "card_click";

/**
 * 도메인 사용 한 번 — **기다리지 않고 실패를 버린다**(화면 영향 0). 로그인했을 때만(게스트 · 로그아웃은 셀 사람이 없다).
 * 셀 수 있는 도메인 · 종류는 서버가 정한다(모르는 값은 서버 400 — 여기서 거르지 않는다).
 * `keepalive` — 카드를 누르면 바로 다른 문서로 떠난다. 금액 · 화면 내용은 싣지 않는다.
 * 클릭 핸들러 · 마운트 뒤 효과에서만 부른다(렌더 중 쿠키 읽기 금지 — `no-render-read`)
 */
export const countUsage = (domain: string, kind: UsageKind): void => {
  if (!hasSession()) return;
  apiFetch(`${INVESTMENTS_BASE_URL}${USAGE_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, kind }),
    keepalive: true,
  }).catch(() => {
    // 계측만 빠진다
  });
};
