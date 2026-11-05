import type { ReactNode } from "react";
import {
  cardStyles,
  dismissStyles,
  eyebrowStyles,
  footStyles,
  headStyles,
  linkStyles,
  readMoreStyles,
  sourceStyles,
  summaryStyles,
  titleStyles,
} from "./styles/timelyTipCard.css";

export interface TimelyTipCardProps {
  /** 머리 작은 줄 — "이번에 해당될 수 있는 제도" 같은 맥락 */
  eyebrow: ReactNode;
  title: ReactNode;
  summary: ReactNode;
  /** 공식 출처 — 정부 · 공공기관 페이지. 새 탭으로 연다 */
  sourceUrl: string;
  sourceName: ReactNode;
  /** 공식 링크 문구("공식 안내 보기") */
  sourceLabel: ReactNode;
  /** 글 전체로 가는 링크 — zone 을 넘는 링크라 부르는 쪽이 만든다(`CrossZoneLink`) */
  readMore?: ReactNode;
  /** 닫기 버튼 이름(화면 리더) */
  dismissLabel: string;
  onDismiss: () => void;
  dismissing?: boolean;
  className?: string;
}

/**
 * 때맞춘 팁 카드(`FE-REQ-058` FR-6) — 각 도메인 zone 이 같은 모양으로 쓴다. 한 화면에 0~1장(서버가 고른다).
 *
 * 문구 · 링크는 전부 받는다 — 이 컴포넌트는 고르지도 지어내지도 않는다. 공식 출처 링크는 하나뿐(가입 · 상품 링크 0, FEATURE-014 FR-5).
 * 닫으면 다시 안 뜬다(서버 기록) — 닫기 뒤 카드를 지우는 것은 부르는 쪽 몫.
 */
export const TimelyTipCard = ({
  eyebrow,
  title,
  summary,
  sourceUrl,
  sourceName,
  sourceLabel,
  readMore,
  dismissLabel,
  onDismiss,
  dismissing = false,
  className,
}: TimelyTipCardProps) => (
  <section className={`${cardStyles} ${className || ""}`} aria-label={typeof title === "string" ? title : undefined}>
    <div className={headStyles}>
      <div>
        <p className={eyebrowStyles}>{eyebrow}</p>
        <p className={titleStyles}>{title}</p>
      </div>
      <button type="button" className={dismissStyles} aria-label={dismissLabel} onClick={onDismiss} disabled={dismissing}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <p className={summaryStyles}>{summary}</p>
    <div className={footStyles}>
      {readMore ? <span className={readMoreStyles}>{readMore}</span> : null}
      <a className={linkStyles} href={sourceUrl} target="_blank" rel="noopener noreferrer">
        {sourceLabel}
      </a>
      <span className={sourceStyles}>{sourceName}</span>
    </div>
  </section>
);

export default TimelyTipCard;
