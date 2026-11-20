import type { SummaryBandItem } from "@repo/ui/summaryBand";

import { caption, hero, heroLabel, heroValue, line, lineLabel, lineValue, summary } from "./AppSummary.css";

export interface AppSummaryProps {
  /** `SummaryBand` 와 같은 칸 — 주인공(`hero`) 하나가 큰 숫자, 나머지는 그 아래 줄. 값은 부르는 쪽(서버 값) */
  items: SummaryBandItem[];
  /** 스크린리더 이름 */
  label: string;
}

/**
 * 앱 웹뷰 요약(`FE-REQ-060` FR-M1 · M2) — 주인공 숫자 한 줄(30) + 이름 · 값 줄. 데스크톱 요약 띠와 **같은 칸 · 같은 값**을 받아 배치만 바꾼다.
 * 서버 컴포넌트에서도 그린다(상태 0). 웹뷰가 아니면 CSS 로 숨는다 — 부르는 쪽은 띠에 `deskOnly` 를 단다
 */
export const AppSummary = ({ items, label }: AppSummaryProps) => {
  const lead = items.find((item) => item.hero) ?? items[0];
  if (!lead) return null;
  const rest = items.filter((item) => item !== lead);
  return (
    <dl className={summary} aria-label={label}>
      <div className={hero}>
        <dt className={heroLabel}>{lead.label}</dt>
        <dd className={heroValue}>{lead.value}</dd>
        {lead.hint ? <dd className={caption}>{lead.hint}</dd> : null}
      </div>
      {rest.map((item) => (
        <div key={item.key} className={line}>
          <dt className={lineLabel}>{item.label}</dt>
          <dd className={lineValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};
