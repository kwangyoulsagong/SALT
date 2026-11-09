const wide = new Intl.NumberFormat("ko-KR");
/** 1원 밑 시세(예: 0.000485원 코인) — 자릿수가 아니라 **유효 숫자 넷**으로 보인다 */
const tiny = new Intl.NumberFormat("ko-KR", { maximumSignificantDigits: 4 });

/**
 * 금액 **표시** 포맷(계산은 서버, `fsd-shared.md`). 1 이상은 천 단위 쉼표 · 소수 셋까지(지금까지와 같다).
 *
 * **0 이 아닌 값은 "0" 으로 보이지 않는다** — 소수 셋까지만 두면 0.000485 가 "0" 이 됐다(2026-11-09 검색 모달 · 시세 표 비트토렌트).
 * 1 밑은 유효 숫자 넷. 숫자가 아니면(NaN · 무한) 그대로 문자열 — 빈칸 처리는 부르는 쪽이 먼저 한다(`PriceCell` 의 "—")
 */
export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return wide.format(value);
  return Math.abs(value) < 1 ? tiny.format(value) : wide.format(value);
};
