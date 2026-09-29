"use client";

import { useHasAccessToken } from "@/shared/api";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { overviewGrid, overviewPending, overviewWide } from "./JudgmentOverview.css";
import { RiskExposurePanel } from "./RiskExposurePanel";
import { ScoreboardPanel } from "./ScoreboardPanel";
import { TargetWeightPanel } from "./TargetWeightPanel";

/**
 * `/investments` 머리 아래 — [이번 주 목표 비중](F010 슬라이스 5 · `FE-REQ-042`) → [위험에 노출된 돈] [판정 성적표]
 * (F010 슬라이스 3 · `FE-REQ-040` FR-5~7 · 리서치 §9-4).
 *
 * 두 카드는 따로 부르고 따로 실패한다(카드 단위 격리). 둘 다 로그인해야 의미가 있어 **로그인 여부를 수화 뒤에** 본다
 * (`useHasAccessToken`) — 서버 렌더와 첫 클라이언트 렌더가 같아야 한다. 모르는 동안은 빈 자리, 로그아웃이면 없다
 * (시세 표는 공개라 표를 가리지 않는다).
 *
 * 새 화면이 아니다 — 진입점 원칙대로 투자 화면 카드다. 목표 비중 카드는 두 칸을 다 쓴다 — 종목 줄이 길어 반 칸이면
 * 금액 · 수량 줄이 끊긴다.
 */
export const JudgmentOverview = () => {
  const signedIn = useHasAccessToken();
  if (signedIn === null) return <div className={overviewPending} aria-hidden="true" />;
  if (!signedIn) return null;
  return (
    <div className={overviewGrid} role="region" aria-label={JUDGMENT_OVERVIEW_MESSAGES.regionLabel}>
      <div className={overviewWide}>
        <TargetWeightPanel />
      </div>
      <RiskExposurePanel />
      <ScoreboardPanel />
    </div>
  );
};
