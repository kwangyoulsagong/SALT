import type { CoachMode } from "../model";

/**
 * 모드의 **유일한 기간** — F009 슬라이스 0 C05 (`SRV-REQ-025` FR-56).
 *
 * ## 왜 한 곳인가
 *
 * 해설은 단타를 "약 25분 이내", 판단은 "5m-24h", 채점은 24시간으로 따로 말했다. 장기도 "1w-1y" 와 30일이었다.
 * 성적표는 **채점한 기간**의 성적이므로, 다른 기간을 말하는 문장 옆에 붙으면 24시간 성적을 25분 전략의
 * 성적처럼 보여 준다. 사용자 결정(2026-09-24): 채점 기준으로 통일 — 단타 24시간 · 장기 30일.
 *
 * 판단 문구 · 해설 · 프롬프트 · 유효시간 코드 · 채점 기간이 전부 이 표를 읽는다. 기간을 바꾸려면 여기 한 줄을
 * 바꾸고, 그러면 기존 표본은 다른 기간의 성적이라 새로 쌓아야 한다.
 */

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

export interface CoachHorizon {
  /** 채점 기간이자 스냅샷 간격(표본 독립성). */
  ms: number;
  /** 판단 응답의 `timeframe`. */
  timeframe: "24h" | "30d";
  /** 유효시간 코드 — 문구는 프론트 i18n 이 만든다(`SRV-REQ-025` FR-45). */
  validityCode: "scalp_24h" | "long_term_30d";
  /** 해설 · 프롬프트의 관찰 기간 문장. 숫자는 `ms` 와 같다. */
  phrase: string;
}

export const COACH_HORIZON: Record<CoachMode, CoachHorizon> = {
  scalp: { ms: DAY_MS, timeframe: "24h", validityCode: "scalp_24h", phrase: "판단 뒤 24시간" },
  long_term: { ms: 30 * DAY_MS, timeframe: "30d", validityCode: "long_term_30d", phrase: "판단 뒤 30일" },
};
