/**
 * 이미 포맷된 금액 글자를 굴릴 수 있게 나눈다 (FE-REQ-062 FR-5).
 *
 * "1,234,567원" · "−12,000원" · "3,000,000원 중" 처럼 **앞의 정수 하나**만 숫자로 본다. 소수 · 단위가 숫자 앞에 오는 글자 ·
 * 숫자가 없는 글자("불러오지 못했어요")는 `null` — 굴리지 않고 그대로 보인다. 숫자를 계산하지 않고 보여 줄 중간값만 만든다.
 */
export interface ParsedAmount {
  sign: "" | "−" | "-";
  value: number;
  rest: string;
  /** 받은 글자에 천 단위 쉼표가 있었나 — 없으면("2027년") 중간값에도 넣지 않는다 */
  grouped: boolean;
}

const PATTERN = /^([−-]?)(\d{1,3}(?:,\d{3})*|\d+)(?![\d.])([^]*)$/;

export const parseAmount = (text: string): ParsedAmount | null => {
  const match = PATTERN.exec(text);
  if (!match) return null;
  const value = Number(match[2]!.replaceAll(",", ""));
  if (!Number.isSafeInteger(value)) return null;
  return { sign: match[1] as ParsedAmount["sign"], value, rest: match[3] ?? "", grouped: match[2]!.includes(",") };
};

const grouping = new Intl.NumberFormat("ko-KR");

export const formatAmount = ({ sign, rest, grouped }: ParsedAmount, value: number): string => {
  const whole = Math.round(value);
  return `${whole === 0 ? "" : sign}${grouped ? grouping.format(whole) : String(whole)}${rest}`;
};
