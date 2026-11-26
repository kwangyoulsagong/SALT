import type { ReactNode } from "react";

import { RolledText } from "../RolledText/RolledText";

import {
  amountCard,
  amountLabel,
  amountLead,
  amountMain,
  amountRest,
  amountValue,
  band,
  heroValue,
  hint as hintClass,
  iconTile,
  label as labelClass,
  tile,
  value as valueClass,
} from "./SummaryBand.css";

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
  /**
   * 금액 카드(`FE-REQ-076` FR-4) — 주면 흰 카드 한 장: 왼쪽 아이콘 판 44(이 그림 — 3D 서비스 아이콘) + 주인공 금액 24/700 위 · 이름 아래,
   * 나머지 칸은 오른쪽 타일. 주인공(`hero`)이 없으면(요약 실패) 지금 띠 그대로 — 실패 문장을 큰 숫자로 보이지 않는다
   */
  icon?: ReactNode;
}

/**
 * 금액 요약 띠(`FE-REQ-060` FR-2) — 화면 맨 위 타일 가로 격자. 값 · 무엇을 보일지는 부르는 쪽(서버 값)이 정한다 — 이 컴포넌트는 숫자를 만들지 않는다.
 * 정의 목록(`dl`)이라 스크린리더가 "이름 · 값" 짝으로 읽는다
 */
/** 주인공 금액은 바뀔 때 굴러간다(FE-REQ-062 FR-5) — 글자일 때만, 나머지 칸은 그대로 */
const heroText = (value: ReactNode) => (typeof value === "string" ? <RolledText text={value} /> : value);

const Tile = ({ item }: { item: SummaryBandItem }) => (
  <div className={tile}>
    <dt className={labelClass}>{item.label}</dt>
    <dd className={item.hero ? `${valueClass} ${heroValue}` : valueClass}>{item.hero ? heroText(item.value) : item.value}</dd>
    {item.hint ? <dd className={hintClass}>{item.hint}</dd> : null}
  </div>
);

export const SummaryBand = ({ items, label, className, icon }: SummaryBandProps) => {
  const lead = icon ? items.find((item) => item.hero) : undefined;
  if (icon && lead) {
    const rest = items.filter((item) => item !== lead);
    return (
      <dl className={className ? `${amountCard} ${className}` : amountCard} aria-label={label}>
        <div className={amountLead}>
          <span className={iconTile} aria-hidden>
            {icon}
          </span>
          {/* 읽는 순서는 이름 → 금액(dt · dd), 보이는 순서는 금액 위(휴대폰 금액 행과 같다) */}
          <div className={amountMain}>
            <dt className={amountLabel}>{lead.hint ? `${lead.label} · ${lead.hint}` : lead.label}</dt>
            <dd className={amountValue}>{heroText(lead.value)}</dd>
          </div>
        </div>
        {rest.length > 0 ? (
          <div className={amountRest}>
            {rest.map((item) => (
              <Tile key={item.key} item={item} />
            ))}
          </div>
        ) : null}
      </dl>
    );
  }
  return (
    <dl className={className ? `${band} ${className}` : band} aria-label={label}>
      {items.map((item) => (
        <Tile key={item.key} item={item} />
      ))}
    </dl>
  );
};

export default SummaryBand;
