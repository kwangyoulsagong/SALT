"use client";

// 클라이언트 잎: 포지션 · 기간 · 코치 설정(매입가 숨김)을 브라우저에서 읽는다(보유 패널과 같은 이유).
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@repo/ui/emptyState";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { usePurchasePriceVisibility } from "@/entities/coach";
import {
  DEFAULT_FLOW_RANGE,
  POSITION_MESSAGES,
  PositionHero,
  RiskRadarView,
  ValueFlow,
  usePositionFlow,
  usePositionOverview,
  type FlowRange,
} from "@/entities/portfolio";

import { emptyLink, stack } from "./PositionOverview.css";

/**
 * 포지션(F006 G절 — `/portfolio` 위쪽) — Hero · 평가금 흐름 · 리스크 레이더(FR-70 · 71 · 73). 보유 0 이면 첫 기록 안내만(FR-78).
 * 개요 · 흐름은 따로 부른다 — 기간 버튼은 흐름만 다시 부르고(FE-REQ-031 FR-91), 흐름 실패가 Hero 를 가리지 않는다(FR-90).
 * 조합만 한다 — 계산 0(`fsd-widgets.md`)
 */
export const PositionOverview = () => {
  const overview = usePositionOverview();
  const purchasePrice = usePurchasePriceVisibility();
  const [range, setRange] = useState<FlowRange>(DEFAULT_FLOW_RANGE);
  const hasHoldings = overview.isSuccess && !overview.data.empty;
  const flow = usePositionFlow(range, hasHoldings);

  if (overview.isSignedOut) return null; // 페이지가 유리막을 그린다
  if (overview.isPending) {
    return (
      <section className={panel} aria-busy="true">
        <Text color="tertiary">{POSITION_MESSAGES.loading}</Text>
      </section>
    );
  }
  if (overview.isError) {
    return (
      <section className={panel}>
        <StatusLine kind="error">{POSITION_MESSAGES.loadFailed}</StatusLine>
      </section>
    );
  }

  const data = overview.data;
  if (data.empty || !data.hero) {
    return (
      <section className={panel}>
        <EmptyState
          iconFrame="none"
          icon={<StatusGraphic kind="empty" />}
          title={POSITION_MESSAGES.emptyTitle}
          description={POSITION_MESSAGES.emptyBody}
          action={
            <Link href={ROUTES.search} className={emptyLink}>
              {POSITION_MESSAGES.emptyCta}
              <NavChevron />
            </Link>
          }
        />
      </section>
    );
  }

  const degradedNotes = data.degradedReasons.map((code) => POSITION_MESSAGES.degraded[code]).filter(Boolean);

  return (
    <div className={stack}>
      <section className={panel} aria-labelledby="position-hero">
        <div className={panelHead}>
          <h2 id="position-hero" className={panelTitle}>{POSITION_MESSAGES.heading}</h2>
        </div>
        <PositionHero hero={data.hero} purchasePrice={purchasePrice} />
        {degradedNotes.map((note) => (
          <StatusLine key={note} kind="blocked">{note}</StatusLine>
        ))}
      </section>
      <section className={panel} aria-labelledby="position-flow">
        <div className={panelHead}>
          <h2 id="position-flow" className={panelTitle}>{POSITION_MESSAGES.flow.heading}</h2>
        </div>
        <ValueFlow
          range={range}
          onRangeChange={setRange}
          flow={flow.data}
          isError={flow.isError}
          isStale={flow.isPlaceholderData || flow.isFetching}
        />
      </section>
      {data.radar ? (
        <section className={panel} aria-labelledby="position-radar">
          <div className={panelHead}>
            <h2 id="position-radar" className={panelTitle}>{POSITION_MESSAGES.radar.heading}</h2>
          </div>
          <RiskRadarView axes={data.radar} />
        </section>
      ) : null}
    </div>
  );
};
