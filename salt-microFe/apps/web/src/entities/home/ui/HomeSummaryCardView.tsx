import { ServiceIcon } from "@repo/ui/serviceicon";

import { NavChevron, ZoneLink } from "@repo/web-shared/ui/frame";

import { HomeCardGhostPreview, HomeCardPreviewView } from "./HomeCardPreviewView";
import { HOME_DOMAIN_ICON } from "../model/domainIcon";
import { HOME_CARD_MESSAGES } from "../model/messages";
import type { HomeCardValue, HomeSummaryCard } from "../model/types";
import { action, cardLink, emptyValue, head, hero, heroValue, label, note, previewSlot, sub, subValue, title, values } from "./HomeSummaryCardView.css";

interface HomeSummaryCardViewProps {
  card: HomeSummaryCard;
  /** 카드를 누른 순간 — 부르기만 한다(계측은 위층이 정한다, `FE-REQ-055` FR-9) */
  onOpen?: () => void;
}

/**
 * 홈 요약 카드 하나 — **표시 전용**(`fsd-entities.md`). 값은 BFF 문자열 그대로, 계산 0 (`FE-REQ-055` FR-1).
 *
 * 데스크톱 카드(`FE-REQ-048` FR-8, 2026-11-19): 도메인 3D 아이콘 + 제목 + 셰브론 → `primary` 를 주인공(18/700)으로 →
 * `secondary` 는 라벨 · 값 한 줄 → 미리보기(흐름선 · 날마다 막대 · 목표 진척 — 2026-11-20 FR-12, 서버 값 그대로) → `note` 한 줄. 링크 이름은 카드 내용(제목 · 값)이다 — `aria-label` 로 덮으면 값을 읽지 못한다.
 * 카드 전체가 그 도메인 zone 진입 링크(`ZoneLink` 가 레지스트리로 `<Link>`/`<a>` 를 고른다). `degraded` 는 값 자리에 한 줄만 둔다.
 */
export const HomeSummaryCardView = ({ card, onOpen }: HomeSummaryCardViewProps) => (
  <ZoneLink href={card.href} className={cardLink} onClick={onOpen}>
    <span className={head}>
      <ServiceIcon variant={HOME_DOMAIN_ICON[card.domain]} />
      <h2 className={title}>{card.title}</h2>
      <NavChevron size={20} />
    </span>
    {card.state === "degraded" ? (
      <p className={note}>{HOME_CARD_MESSAGES.degraded}</p>
    ) : (
      <>
        <dl className={values}>
          <HeroValue item={card.primary} empty={card.state === "empty"} />
          <SubValue item={card.secondary} />
        </dl>
        {/* 미리보기 — `contents` 라 카드 배치 그대로(휴대폰 `/m/home` 행에는 없다, `FE-REQ-072`) */}
        <div className={previewSlot}>
          {card.preview ? (
            <HomeCardPreviewView domain={card.domain} preview={card.preview} />
          ) : card.state === "empty" ? (
            <HomeCardGhostPreview domain={card.domain} />
          ) : null}
        </div>
        {card.note ? <p className={note}>{card.note}</p> : null}
        {/* 비어 있는 카드 — 카드 전체가 이 행동으로 간다(링크 안에 링크를 두지 않는다 — 버튼 모양 글자) */}
        {card.action ? (
          <span className={action}>
            {card.action}
            <NavChevron size={16} />
          </span>
        ) : null}
      </>
    )}
  </ZoneLink>
);

const HeroValue = ({ item, empty }: { item: HomeCardValue | null; empty: boolean }) =>
  item ? (
    <div className={hero}>
      <dt className={label}>{item.label}</dt>
      <dd className={empty ? emptyValue : heroValue}>{item.value}</dd>
    </div>
  ) : null;

const SubValue = ({ item }: { item: HomeCardValue | null }) =>
  item ? (
    <div className={sub}>
      <dt className={label}>{item.label}</dt>
      <dd className={subValue}>{item.value}</dd>
    </div>
  ) : null;
