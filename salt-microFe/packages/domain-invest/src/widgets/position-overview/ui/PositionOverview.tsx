"use client";

// 클라이언트 잎: 포지션 · 기간 · 코치 설정(매입가 숨김)을 브라우저에서 읽는다(보유 패널과 같은 이유).
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { usePurchasePriceVisibility } from "@/entities/coach";
import { LEDGER_SHEET_MESSAGES } from "@/features/record-transaction";
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

import { emptyLink, footLinks, headAction, stack } from "./PositionOverview.css";

/** 거래 시트는 누를 때만 받는다 — 첫 화면은 Hero · 흐름 · 레이더(`FE-REQ-033` FR-74). 열기 전엔 그리지 않으므로 대체 화면이 필요 없다 */
const TransactionSheet = dynamic(
  () => import("@/features/record-transaction").then((mod) => mod.TransactionSheet),
  { ssr: false }
);

/**
 * 포지션(F006 G절 — `/portfolio` 위쪽) — Hero · 평가금 흐름 · 리스크 레이더(FR-70 · 71 · 73). 보유 0 이면 첫 기록 안내만(FR-78).
 * 개요 · 흐름은 따로 부른다 — 기간 버튼은 흐름만 다시 부르고(FE-REQ-031 FR-91), 흐름 실패가 Hero 를 가리지 않는다(FR-90).
 * [거래 기록 추가] 시트(2단계 FR-104)는 Hero 머리 · 빈 상태에서 연다. 아래에 보유 기록 관리 · 설정 링크(FR-109).
 * 조합만 한다 — 계산 0(`fsd-widgets.md`)
 */
export const PositionOverview = () => {
  const overview = usePositionOverview();
  const purchasePrice = usePurchasePriceVisibility();
  const [range, setRange] = useState<FlowRange>(DEFAULT_FLOW_RANGE);
  const hasHoldings = overview.isSuccess && !overview.data.empty;
  const flow = usePositionFlow(range, hasHoldings);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 한 번 연 뒤로는 붙여 둔다 — 닫힘 움직임이 끝까지 돈다
  const [sheetMounted, setSheetMounted] = useState(false);
  const openSheet = () => {
    setSheetMounted(true);
    setSheetOpen(true);
  };
  const sheet = sheetMounted ? <TransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} /> : null;

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
          action={<Button onClick={openSheet}>{LEDGER_SHEET_MESSAGES.openButton}</Button>}
        />
        {sheet}
      </section>
    );
  }

  const degradedNotes = data.degradedReasons.map((code) => POSITION_MESSAGES.degraded[code]).filter(Boolean);

  return (
    <div className={stack}>
      <section className={panel} aria-labelledby="position-hero">
        <div className={panelHead}>
          <h2 id="position-hero" className={panelTitle}>{POSITION_MESSAGES.heading}</h2>
          <Button size="sm" variant="weak" className={headAction} onClick={openSheet}>
            {LEDGER_SHEET_MESSAGES.openButton}
          </Button>
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
      <nav className={footLinks} aria-label={POSITION_MESSAGES.heading}>
        <Link href={ROUTES.portfolioTransactions} className={emptyLink}>
          {POSITION_MESSAGES.manageLink}
          <NavChevron />
        </Link>
        <Link href={ROUTES.coachSettings} className={emptyLink}>
          {POSITION_MESSAGES.settingsLink}
          <NavChevron />
        </Link>
      </nav>
      {sheet}
    </div>
  );
};
