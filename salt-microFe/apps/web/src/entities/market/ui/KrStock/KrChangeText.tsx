import { formatPrice } from "@/shared/lib";

import { change } from "./krStock.css";

const MINUS = "−";

interface KrChangeTextProps {
  /** 전일 대비 등락률(%) — 서버 값 */
  rate: number;
  /** 전일 대비 금액(원) — 서버 값. 주면 금액도 같이 쓴다 */
  amount?: number;
}

/**
 * 등락 표시 — 부호 + 색(색만으로 방향을 말하지 않는다). 0 은 부호 없이 중립색: 개장 직후 기준가 그대로인 종목이 많아
 * 하락 색으로 그리면 거짓이다(코인 `ChangeRateCell` 은 0 을 하락 색으로 그린다 — 기존 화면이라 건드리지 않는다)
 */
export const KrChangeText = ({ rate, amount }: KrChangeTextProps) => {
  const fixed = Math.abs(rate).toFixed(2);
  const tone = Number(fixed) === 0 ? "flat" : rate > 0 ? "up" : "down";
  const sign = tone === "up" ? "+" : tone === "down" ? MINUS : "";
  return (
    <span className={change[tone]}>
      {amount !== undefined && `${sign}${formatPrice(Math.abs(amount))}원 `}
      {amount !== undefined ? `(${sign}${fixed}%)` : `${sign}${fixed}%`}
    </span>
  );
};
