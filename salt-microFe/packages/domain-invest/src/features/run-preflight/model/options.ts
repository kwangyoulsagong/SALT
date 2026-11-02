/**
 * 칩 값 (`FE-REQ-026` FR-152 · FR-153). 고르는 값일 뿐 계산하지 않는다 — 손절 비율은 그대로 서버에 보내고
 * 가격 환산은 서버가 한다.
 *
 * - 금액: "전액" 칩이 없다 — 현금 기록이 없다(B13)
 * - 손절: 음수 소수. 서버 검증 범위는 −50% 이상 0 미만
 */
export const PREFLIGHT_AMOUNT_CHIPS = [
  { value: 100_000, label: "10만" },
  { value: 300_000, label: "30만" },
  { value: 500_000, label: "50만" },
  { value: 1_000_000, label: "100만" },
] as const;

export const PREFLIGHT_STOP_CHIPS = [
  { value: -0.015, label: "−1.5%" },
  { value: -0.03, label: "−3%" },
  { value: -0.05, label: "−5%" },
  { value: -0.08, label: "−8%" },
  { value: -0.12, label: "−12%" },
] as const;
