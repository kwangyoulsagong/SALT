import type { SummaryBandItem } from "@repo/ui/summaryBand";
import { RolledText } from "@repo/ui/rolledText";
import { ServiceIcon, type ServiceIconVariant } from "@repo/ui/serviceicon";

import * as s from "./MobileSummary.css";

export interface MobileSummaryProps {
  /** 데스크톱 `SummaryBand` 와 같은 칸 — 주인공(`hero`) 하나가 큰 숫자, 나머지는 그 아래 줄. 주인공이 없으면 전부 줄(실패 문장을 큰 숫자로 보이지 않게). 값은 부르는 쪽(서버 값) */
  items: SummaryBandItem[];
  /** 스크린리더 이름 */
  label: string;
  /**
   * 탭 화면 금액 카드(`FE-REQ-074` FR-1) — 주면 왼쪽 아이콘 판 44 + 금액 `t3` 22 Bold 위 · 이름 아래, 나머지 줄은 카드 바닥 줄(홈 도메인 카드와 같은 모양).
   * 없으면 상세 머리 모양(이름 위 · 금액 `t1` 30)
   */
  icon?: ServiceIconVariant;
}

const Lines = ({ items, className }: { items: SummaryBandItem[]; className: string }) =>
  items.length === 0 ? null : (
    <dl className={className}>
      {items.map((item) => (
        <div key={item.key} className={s.line}>
          <dt className={s.lineLabel}>{item.label}</dt>
          <dd className={s.lineValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );

/**
 * 휴대폰 요약(`FE-REQ-072` FR-2 ← `FE-REQ-060` FR-M1 · M2) — 주인공 숫자 한 줄 + 이름 · 값 줄.
 * 데스크톱 요약 띠와 **같은 칸 · 같은 값**을 받아 배치만 다르다. 서버 컴포넌트에서도 그린다(상태 0)
 */
export const MobileSummary = ({ items, label, icon }: MobileSummaryProps) => {
  if (items.length === 0) return null;
  const lead = items.find((item) => item.hero);
  const rest = items.filter((item) => item !== lead);

  if (icon) {
    return (
      <div className={s.summary} role="group" aria-label={label}>
        {lead ? (
          <div className={s.amountRow}>
            <span className={s.iconTile} aria-hidden>
              <ServiceIcon variant={icon} />
            </span>
            {/* 읽는 순서는 이름 → 금액(dt · dd), 보이는 순서는 금액 위(기준 화면 금액 행) */}
            <dl className={s.amountMain}>
              <dt className={s.amountLabel}>{lead.hint ? `${lead.label} · ${lead.hint}` : lead.label}</dt>
              <dd className={s.amountValue}>{typeof lead.value === "string" ? <RolledText text={lead.value} /> : lead.value}</dd>
            </dl>
          </div>
        ) : null}
        <Lines items={rest} className={lead ? s.foot : s.lines} />
      </div>
    );
  }

  return (
    <div className={s.summary} role="group" aria-label={label}>
      {lead ? (
        <dl className={s.hero}>
          <dt className={s.heroLabel}>{lead.label}</dt>
          <dd className={s.heroValue}>{typeof lead.value === "string" ? <RolledText text={lead.value} /> : lead.value}</dd>
          {lead.hint ? <dd className={s.caption}>{lead.hint}</dd> : null}
        </dl>
      ) : null}
      <Lines items={rest} className={s.lines} />
    </div>
  );
};
