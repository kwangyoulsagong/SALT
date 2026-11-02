import type { CoachMode } from "@repo/core/coach";

/**
 * `POST /api/app/ai-coach/explain(/stream)` 요청 — **종목과 관점뿐이다**(서버 `SRV-REQ-025` FR-58, F009 슬라이스 0 C01).
 *
 * 시세 · 근거 · 뉴스는 서버가 판단 게이트와 같은 재료로 조립한다. 예전엔 화면이 옮겨 적어 보냈고, 서버는
 * 그 값이 게이트가 본 것과 같은지 알 수 없었다.
 */
export interface ExplainSymbolRequest {
  symbol: string;
  mode: CoachMode;
}

/**
 * 해설 응답 — BFF 가 가공하지 않고 넘기는 서버 `CoachExplanation`.
 *
 * `@repo/core/coach` 에 두지 않는 이유: BFF 가 이 모양을 소유하지 않는다(통과시킬 뿐이다).
 * 뷰모델처럼 "BFF 타입의 사본"이라고 적을 원본이 없다. 소비처가 이 기능 하나다.
 *
 * `timeframe` 은 **그리지 않는다**(`FE-REQ-026` FR-136) — 화면의 기간은 `validity.code` 하나다.
 * 예상 수익률 필드는 서버가 타입에서 지웠다(2026-09-18).
 */
export interface CoachExplanation {
  modeReasoning: string;
  timeframe: string;
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
  disclaimer: string;
  generatedAt: string;
  cached: boolean;
}

/**
 * 해설 응답 전체 (`SRV-REQ-025` FR-50, 2026-09-22).
 *
 * 서버가 판단 게이트를 먼저 본다 — 막히면 **LLM 을 부르지 않고** `renderable: false` 를 200 으로
 * 준다. 화면도 같은 게이트로 버튼을 숨기므로 평소엔 오지 않는다. 뷰모델이 낡은 사이 게이트가
 * 닫힌 경우에만 온다. 렌더되는 응답에 서버가 싣는 성적표 · 실패사례는 쓰지 않는다 — 카드는
 * 이미 뷰모델의 것을 그린다.
 */
export type ExplainResult =
  | (CoachExplanation & { renderable: true })
  | { renderable: false; blockedReason: string };
