"use client";

// 클라이언트 잎: 코치 설정(매입가 숨김)을 읽어 보유 요약에 넘긴다.
import { useCoachProfile } from "@/entities/coach";
import { InvestmentSummary } from "@/entities/portfolio";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { COACH_CONSOLE_MESSAGES } from "../model";

/**
 * 내 보유 — 종목별 평가금액 · 손익률 · 합계 (`FE-REQ-010` FR-5 · 매입가 숨김 F009 FR-27 · `FE-REQ-039` FR-13).
 *
 * 2026-11-02 홈에서 옮겼다 — 홈은 도메인 요약 카드만 그린다(`ADR-005` §2). 놓는 자리는 코치 리포트 맨 위(사용자 결정 —
 * 투자 화면 첫 화면은 시세 표). 두 엔티티(보유 · 코치 설정)를 잇는 것이라 위젯이 한다(전의 홈 `InvestmentsSummaryLeaf` 그대로).
 *
 * 설정을 못 불러왔으면 서버 기본(보임)으로 본다. 오는 중이면 손익률을 아직 그리지 않는다 — 켠 사람에게 한 번 보였다
 * 사라지면 숨김이 아니다.
 */
export const HoldingsPanel = () => {
  const profile = useCoachProfile();
  const purchasePrice =
    profile.isSignedOut || profile.isError
      ? "shown"
      : profile.isPending
        ? "unknown"
        : profile.data.hidePurchasePrice
          ? "hidden"
          : "shown";

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{COACH_CONSOLE_MESSAGES.holdingsHeading}</h2>
      </div>
      <InvestmentSummary purchasePrice={purchasePrice} />
    </section>
  );
};
