import type { KrIndex } from "@repo/core/marketKr";

import { kstClock } from "@repo/core/marketKr";

import { KR_STOCK_MESSAGES } from "../../model/krStockMessages";
import { card, indexChange, nameRow, staleBadge, strip, sub, value, valueRow } from "./KrIndexSummary.css";
import { visuallyHidden } from "./krStock.css";

const M = KR_STOCK_MESSAGES.indices;
const MINUS = "−";

const points = (v: number) => v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 지수 등락 — 포인트 + 등락률. 부호 + 색(색만으로 방향을 말하지 않는다). 0 은 중립(`KrChangeText` 와 같은 규칙) */
const IndexChange = ({ amount, rate }: { amount: number; rate: number }) => {
  const fixed = Math.abs(rate).toFixed(2);
  const tone = Number(fixed) === 0 ? "flat" : rate > 0 ? "up" : "down";
  const sign = tone === "up" ? "+" : tone === "down" ? MINUS : "";
  return <span className={indexChange[tone]}>{`${sign}${points(Math.abs(amount))} (${sign}${fixed}%)`}</span>;
};

/**
 * 국내 지수 요약(F011 슬라이스 6 · `FE-REQ-041`) — **표시만.** 어떤 지수를 어떤 순서로 보일지 · 값 · 등락은 서버 것이다
 * (요약은 서버 소유 — 프론트 지수 상수 0건). 아직 못 받은 지수는 응답에 없어 칸도 없다.
 * 종목 수는 상승 · 하락만 보이고 보합까지 스크린리더에 준다.
 */
export const KrIndexSummary = ({ items }: { items: KrIndex[] }) => (
  <section className={strip} aria-label={M.regionLabel}>
    {items.map((index) => (
      <div key={index.code} className={card}>
        <div className={nameRow}>
          <span>{index.name}</span>
          {index.stale && (
            <span className={staleBadge} title={M.staleTitle}>
              {M.stale}
            </span>
          )}
        </div>
        <div className={valueRow}>
          <span className={value}>{points(index.value)}</span>
          <IndexChange amount={index.change} rate={index.changeRate} />
        </div>
        {index.advancers !== null && index.decliners !== null && (
          <p className={sub}>
            <span aria-hidden="true">{M.breadth(index.advancers, index.decliners)}</span>
            <span className={visuallyHidden}>{M.breadthLabel(index.advancers, index.unchanged ?? 0, index.decliners)}</span>
            {` · ${M.asOf(kstClock(index.updatedAt))}`}
          </p>
        )}
      </div>
    ))}
  </section>
);
