import { formatPrice } from "@/shared/lib";

const MINUS = "−";

/** 서버가 준 손익(원 정수) → `+33,000` · `−5,000`. 부호만 붙인다 — 계산하지 않는다. 0 은 부호 없음 */
export const formatSignedKrw = (amount: number): string => {
  if (amount === 0) return formatPrice(0);
  return amount > 0 ? `+${formatPrice(amount)}` : `${MINUS}${formatPrice(Math.abs(amount))}`;
};
