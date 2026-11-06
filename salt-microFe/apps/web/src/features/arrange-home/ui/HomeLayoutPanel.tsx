"use client";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { Toggle } from "@repo/ui/toggle";

import { useHasSession } from "@repo/web-shared/api";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { useHomeCards, type HomeDomain } from "@/entities/home";

import { useArrangeHome } from "../api/useArrangeHome";
import { ARRANGE_HOME_MESSAGES as MSG } from "../model/messages";
import { actions, description, label, list, placeholder, row } from "./HomeLayoutPanel.css";

/**
 * 홈 카드 순서 · 숨김(`FE-REQ-055` FR-2 · `BFF-REQ-046` FR-5) — 셸 `/settings` 패널. 홈은 읽기 전용으로 두고(`fsd-widgets.md`) 편집은 여기서 한다.
 * 줄 = 홈 응답의 카드(이름은 BFF 카드 제목) · 순서 · 숨김 모두 서버 값. 바꾸면 바로 저장(알림 패널과 같은 꼴).
 * 마지막 보이는 카드는 끌 수 없게 토글을 막지 않는다 — 서버가 거절하고 되돌린다(규칙 한 곳).
 */
export const HomeLayoutPanel = () => {
  const signedIn = useHasSession();
  const home = useHomeCards();
  const arrange = useArrangeHome();

  if (signedIn === false) return null;

  // 저장 중에도 받는다 — 차례로 보낸다(`useArrangeHome` scope). 다음 값은 낙관적으로 바뀐 캐시에서 만든다
  const save = (order: HomeDomain[], hidden: HomeDomain[]) => arrange.mutate({ order, hidden });

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{MSG.heading}</h2>
      </div>
      <p className={description}>{MSG.description}</p>
      {home.isError ? (
        <StatusLine kind="error">{MSG.unavailable}</StatusLine>
      ) : !home.data ? (
        <div className={placeholder} aria-busy="true" />
      ) : (
        <ol className={list}>
          {home.data.order.map((domain, index) => {
            const card = home.data.cards.find((c) => c.domain === domain);
            if (!card) return null;
            const { order, hidden } = home.data;
            const move = (to: number) => {
              const next = [...order];
              next.splice(index, 1);
              next.splice(to, 0, domain);
              save(next, hidden);
            };
            return (
              <li key={domain} className={row}>
                <span className={label}>{card.title}</span>
                <div className={actions}>
                  <Button variant="ghost" size="xs" aria-label={MSG.moveUp(card.title)} disabled={index === 0} onClick={() => move(index - 1)}>
                    {MSG.up}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={MSG.moveDown(card.title)}
                    disabled={index === order.length - 1}
                    onClick={() => move(index + 1)}
                  >
                    {MSG.down}
                  </Button>
                  <Toggle
                    aria-label={MSG.show(card.title)}
                    checked={!hidden.includes(domain)}
                    onChange={(on) => save(order, on ? hidden.filter((d) => d !== domain) : [...hidden, domain])}
                    aria-busy={arrange.isPending}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {arrange.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
    </section>
  );
};
