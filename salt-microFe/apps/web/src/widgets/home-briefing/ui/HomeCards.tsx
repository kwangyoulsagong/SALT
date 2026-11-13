"use client";

// 클라이언트 잎: 토큰이 localStorage 에 있어(`FE-REQ-013` 전) 서버에서 BFF 를 부를 수 없다.
// (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { countUsage } from "@repo/web-shared/api";

import { HOME_CARD_MESSAGES, HomeSummaryCardView, useHomeCards } from "@/entities/home";

import { HOME_BLOCK_MIN_HEIGHT } from "../model/messages";
import { cardList } from "./HomeCards.css";

/**
 * 도메인 요약 카드 목록 (`FE-REQ-055` FR-2). 순서는 BFF `order` 그대로, `hidden` 은 그리지 않는다.
 *
 * 카드 하나의 실패는 카드가 `degraded` 로 그린다 — BFF 가 카드별로 격리해서 준다(`BFF-REQ-046`).
 * 응답 전체를 못 받은 경우만 여기서 한 줄로 알린다. 카드를 누르면 도메인 사용 한 번(`FE-REQ-055` FR-8 — 기다리지 않는다).
 */
export const HomeCards = () => {
  const home = useHomeCards();

  if (home.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={HOME_CARD_MESSAGES.loading}>
        <Skeleton height={HOME_BLOCK_MIN_HEIGHT.cards} radius="medium" />
      </div>
    );
  }
  if (home.isError) return <StatusLine kind="error">{HOME_CARD_MESSAGES.loadFailed}</StatusLine>;

  const hidden = new Set(home.data.hidden);
  const cards = home.data.order
    .filter((domain) => !hidden.has(domain))
    .map((domain) => home.data.cards.find((card) => card.domain === domain))
    .filter((card) => card !== undefined);

  return (
    <ul className={cardList}>
      {cards.map((card) => (
        <li key={card.domain}>
          <HomeSummaryCardView card={card} onOpen={() => countUsage(card.domain, "card_click")} />
        </li>
      ))}
    </ul>
  );
};
