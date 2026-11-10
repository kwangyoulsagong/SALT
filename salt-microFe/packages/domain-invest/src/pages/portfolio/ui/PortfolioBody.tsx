"use client";

// 클라이언트 잎: 보유 · 코치 설정 조회가 브라우저 쪽이다(코치 리포트 본문과 같은 이유 — `CoachReportBody`).
import dynamic from "next/dynamic";

/**
 * 포트폴리오 본문(`FE-REQ-069` FR-4) — 내 보유(종목별 평가금액 · 손익률 · 합계)와 매입가 숨김.
 * 보유 칸은 코치 리포트 맨 위에 있던 그 위젯 그대로다(2026-11-02 홈 → 리포트 → 2026-11-10 여기) — 다시 만들지 않는다
 */
const Holdings = dynamic(() => import("@/widgets/coach-console").then((mod) => mod.HoldingsPanel), {
  ssr: false,
  loading: () => null,
});

const PurchasePrice = dynamic(
  () => import("@/features/toggle-purchase-price").then((mod) => mod.PurchasePriceToggle),
  { ssr: false, loading: () => null },
);

export const PortfolioBody = () => (
  <>
    <Holdings />
    <PurchasePrice />
  </>
);

export default PortfolioBody;
