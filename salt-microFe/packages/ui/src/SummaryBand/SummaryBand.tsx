import type { ReactNode } from "react";

import { band, heroValue, hint as hintClass, label as labelClass, tile, value as valueClass } from "./SummaryBand.css";

export interface SummaryBandItem {
  /** 반복 키 */
  key: string;
  label: string;
  value: ReactNode;
  /** 값 아래 한 줄(12/500 2단) — 건수 · 남은 날 같은 보조 */
  hint?: ReactNode;
  /** 주인공 — 한 띠에 하나만 18/700 */
  hero?: boolean;
}

export interface SummaryBandProps {
  items: SummaryBandItem[];
  /** 띠 이름(스크린리더) */
  label: string;
  className?: string;
}

/**
 * 금액 요약 띠(`FE-REQ-060` FR-2) — 화면 맨 위 타일 가로 격자. 값 · 무엇을 보일지는 부르는 쪽(서버 값)이 정한다 — 이 컴포넌트는 숫자를 만들지 않는다.
 * 정의 목록(`dl`)이라 스크린리더가 "이름 · 값" 짝으로 읽는다
 */
export const SummaryBand = ({ items, label, className }: SummaryBandProps) => (
  <dl className={className ? `${band} ${className}` : band} aria-label={label}>
    {items.map((item) => (
      <div key={item.key} className={tile}>
        <dt className={labelClass}>{item.label}</dt>
        <dd className={item.hero ? `${valueClass} ${heroValue}` : valueClass}>{item.value}</dd>
        {item.hint ? <dd className={hintClass}>{item.hint}</dd> : null}
      </div>
    ))}
  </dl>
);

export default SummaryBand;
