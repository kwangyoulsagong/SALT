"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`InvestmentsBoard` 와 같은 이유).
import dynamic from "next/dynamic";

/**
 * 본문(차트 · 판단 · 한 장 패널 · 수익 플랜). **`ssr:false` 다** — 판단 조회는 토큰이 필요하고 토큰은
 * 브라우저 `localStorage` 에만 있다(`FE-REQ-013` 전). 서버에서 그리면 "로그인 안 됨"으로 그렸다가
 * 브라우저에서 다른 것을 그려 수화 불일치가 난다. 머리는 페이지가 서버에서 그린다.
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 이 자리가 클라이언트에 남은 것은 아직 서버 조회로 옮기지 않아서다 — 목록은 `FE-REQ-013` FR-81)
 *
 * 한 장 패널(F017 v4 1e)은 다른 위젯이라 본문 위젯이 직접 부를 수 없다 — 페이지가 끼워 준다(`fsd-widgets.md` cross-slice 금지)
 */
const SymbolAnalysis = dynamic(
  () => import("@/widgets/symbol-analysis").then((mod) => mod.SymbolAnalysis),
  { ssr: false, loading: () => null },
);
const ScenarioPanel = dynamic(
  () => import("@/widgets/scenario-panel").then((mod) => mod.ScenarioPanel),
  { ssr: false, loading: () => null },
);

export const InvestmentDetailBody = ({ symbol }: { symbol: string }) => (
  <SymbolAnalysis symbol={symbol} scenarioPanel={<ScenarioPanel symbol={symbol} asset="crypto" />} />
);

export default InvestmentDetailBody;
