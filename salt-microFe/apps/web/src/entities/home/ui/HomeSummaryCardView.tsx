import { Card } from "@repo/ui/card";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import { NavChevron, ZoneLink } from "@repo/web-shared/ui";

import { HOME_CARD_MESSAGES } from "../model/messages";
import type { HomeCardValue, HomeSummaryCard } from "../model/types";
import { cardLink, head, note, value, values } from "./HomeSummaryCardView.css";

interface HomeSummaryCardViewProps {
  card: HomeSummaryCard;
  /** 카드를 누른 순간 — 부르기만 한다(계측은 위층이 정한다, `FE-REQ-055` FR-8) */
  onOpen?: () => void;
}

/**
 * 홈 요약 카드 하나 — **표시 전용**(`fsd-entities.md`). 값은 BFF 문자열 그대로, 계산 0 (`FE-REQ-055` FR-1).
 *
 * 링크 이름은 카드 내용(제목 · 값)이다 — `aria-label` 로 덮으면 값을 읽지 못한다.
 * 카드 전체가 그 도메인 zone 진입 링크다. 도메인이 아직 셸에 있으면(`hostedIn`) `<Link>`, 다른 zone 이면
 * `CrossZoneLink` — `ZoneLink` 가 레지스트리로 고른다. `degraded` 는 값 자리에 한 줄만 둔다.
 */
export const HomeSummaryCardView = ({ card, onOpen }: HomeSummaryCardViewProps) => {
  const body = (
    <Card>
      <div className={head}>
        <Heading level={3}>{card.title}</Heading>
        <NavChevron size={20} />
      </div>
      {card.state === "degraded" ? (
        <Text color="muted">{HOME_CARD_MESSAGES.degraded}</Text>
      ) : (
        <dl className={values}>
          <CardValue item={card.primary} />
          <CardValue item={card.secondary} />
        </dl>
      )}
      {card.note && card.state !== "degraded" ? (
        <div className={note}>
          <Text color="tertiary">{card.note}</Text>
        </div>
      ) : null}
    </Card>
  );

  return (
    <ZoneLink href={card.href} className={cardLink} onClick={onOpen}>
      {body}
    </ZoneLink>
  );
};

const CardValue = ({ item }: { item: HomeCardValue | null }) =>
  item ? (
    <div>
      <dt>
        <Text color="muted">{item.label}</Text>
      </dt>
      <dd className={value}>
        <Text variant="bodyLarge">{item.value}</Text>
      </dd>
    </div>
  ) : null;
