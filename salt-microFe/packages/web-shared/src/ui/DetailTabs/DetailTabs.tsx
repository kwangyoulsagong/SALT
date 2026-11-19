"use client";

import { Tabs } from "@repo/ui/tabs";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PREFLIGHT_ANCHOR_ID } from "../../config";
import { useWideViewport } from "../../lib";
import { aside as asideStyle, grid, main, panel, root, tabBar } from "./DetailTabs.css";
import { detailViewHref, resolveDetailView } from "./detailView";

/** 탭이 사는 주소 이름 — 새로고침 · 뒤로가 같은 탭(`FE-REQ-049` FR-2) */
export const DETAIL_VIEW_PARAM = "view";

export interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface DetailTabsProps {
  /** 첫 칸이 기본 탭(개요). 칸이 하나면 탭 줄을 그리지 않는다 */
  tabs: DetailTab[];
  /** 오른쪽 고정 열 — 1280 미만에선 탭 하나로 들어간다 */
  aside: { id: string; label: string; content: ReactNode };
  /** 탭 목록 이름(스크린리더) */
  label: string;
}

const PREFLIGHT_HREF = `#${PREFLIGHT_ANCHOR_ID}`;

/**
 * 종목 상세 본문 틀(`FE-REQ-049` FR-2 · 3 · 11) — 알약 탭 + 왼쪽 패널 + 오른쪽 고정 열.
 *
 * - 탭은 주소 `?view=` 하나가 저장소다(기간 탭 `?horizon=` 과 같은 방식 — `history.replaceState`, 기록을 쌓지 않는다)
 * - 탭 내용은 **처음 열 때 붙이고 그 뒤로는 숨기기만** 한다 — 차트 · 입력 중인 거래 기록이 탭을 오가도 남는다
 * - 1280 미만이면 오른쪽 열이 마지막 탭이 되고, 머리의 [주문 전 체크] 링크(`#preflight-check`)가 그 탭을 연다
 * - 넓은 폭을 아직 모를 때(`null`)는 넓은 배치로 그린다 — 본문은 브라우저에서만 그려져 수화가 갈리지 않는다
 */
export const DetailTabs = ({ tabs, aside, label }: DetailTabsProps) => {
  const idBase = useId();
  const wide = useWideViewport();
  const asideIsTab = wide === false;
  const params = useSearchParams();
  const fromUrl = params?.get(DETAIL_VIEW_PARAM) ?? null;

  const allTabs = asideIsTab ? [...tabs, { id: aside.id, label: aside.label, content: null }] : tabs;
  const firstId = tabs[0]?.id ?? aside.id;
  const active = resolveDetailView(fromUrl, tabs.map((t) => t.id), aside.id, asideIsTab);

  const setView = useCallback(
    (next: string) => {
      window.history.replaceState(null, "", detailViewHref(window.location.href, next, firstId, DETAIL_VIEW_PARAM));
    },
    [firstId],
  );

  // 처음 연 탭만 붙인다 — 숨은 탭의 조회가 첫 화면을 늦추지 않게
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set([active]));
  useEffect(() => {
    setOpened((prev) => (prev.has(active) ? prev : new Set(prev).add(active)));
  }, [active]);

  // 좁은 폭: 머리의 [주문 전 체크] 가 숨은 오른쪽 열을 가리키면 그 탭을 먼저 연다(카드가 스크롤 · 포커스 · 시트를 맡는다)
  useEffect(() => {
    if (!asideIsTab) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(`a[href="${PREFLIGHT_HREF}"]`);
      if (link) setView(aside.id);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [asideIsTab, aside.id, setView]);

  const asideShown = !asideIsTab || active === aside.id;
  return (
    <div className={root}>
      {allTabs.length > 1 && (
        <Tabs
          className={tabBar}
          variant="pill"
          label={label}
          idBase={idBase}
          tabs={allTabs.map(({ id, label: tabLabel }) => ({ id, label: tabLabel }))}
          activeTab={active}
          onTabChange={setView}
        />
      )}
      <div className={grid}>
        <div className={main} hidden={asideIsTab && active === aside.id}>
          {tabs.map((tab) =>
            opened.has(tab.id) || tab.id === active ? (
              <div
                key={tab.id}
                className={panel}
                hidden={tab.id !== active}
                {...(allTabs.length > 1
                  ? { role: "tabpanel", id: `${idBase}-panel-${tab.id}`, "aria-labelledby": `${idBase}-tab-${tab.id}` }
                  : {})}
              >
                {tab.content}
              </div>
            ) : null,
          )}
        </div>
        <aside
          className={asideStyle}
          aria-label={aside.label}
          hidden={!asideShown}
          {...(asideIsTab ? { role: "tabpanel", id: `${idBase}-panel-${aside.id}`, "aria-labelledby": `${idBase}-tab-${aside.id}` } : {})}
        >
          {aside.content}
        </aside>
      </div>
    </div>
  );
};
