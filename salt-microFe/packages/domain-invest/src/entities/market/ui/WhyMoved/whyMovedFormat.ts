/** "왜 움직였나" 카드 · 프리뷰가 같이 쓰는 표기 — 부호 글자 + 소수 둘째 자리(서버 값, 새 계산 0). 색만으로 방향을 말하지 않는다 */
export type MoveTone = "up" | "down" | "flat";

const MINUS = "−";

export const moveTone = (v: number): MoveTone => (Number(Math.abs(v).toFixed(2)) === 0 ? "flat" : v > 0 ? "up" : "down");

export const signedText = (v: number, unit: string): string => {
  const tone = moveTone(v);
  return `${tone === "up" ? "+" : tone === "down" ? MINUS : ""}${Math.abs(v).toFixed(2)}${unit}`;
};

export { MINUS };
