"use client";

import { SignInRequired } from "@repo/web-shared/ui";

import { ScenarioPanel } from "@/widgets/scenario-panel";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as M } from "../model";
import { detailPanel, detailPanelTop } from "@repo/web-shared/ui/surface.css";

/**
 * 국내 주식 한 장 패널(F017 v4 순서 1e · `FE-REQ-064` FR-8) — 코인 상세와 **같은 패널 · 같은 자리(개요 탭 차트 아래 — `FE-REQ-049`)**.
 *
 * 모든 종목에 늘 보인다(과거 실제 결과 · 원인 · 성적 · 해설) — "자세히" 뒤로 접지 않는다(사용자 2026-11-13 "모든 종목에 항상").
 * 로그인 안 했으면 유리막. 면책은 패널 아래 한 번
 */
export const KrScenario = ({ code }: { code: string }) => (
  <SignInRequired what={M.guestWhat.scenario} minHeight={480}>
    <ScenarioPanel className={`${detailPanel} ${detailPanelTop}`} symbol={code} asset="kr" />
  </SignInRequired>
);
