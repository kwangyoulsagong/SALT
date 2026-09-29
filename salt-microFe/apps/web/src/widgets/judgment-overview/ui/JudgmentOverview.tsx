"use client";

import { useHasAccessToken } from "@/shared/api";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { overviewGrid, overviewPending } from "./JudgmentOverview.css";
import { RiskExposurePanel } from "./RiskExposurePanel";
import { ScoreboardPanel } from "./ScoreboardPanel";

/**
 * `/investments` 머리 아래 — [위험에 노출된 돈] [판정 성적표] (F010 슬라이스 3 · `FE-REQ-040` FR-5~7 · 리서치 §9-4).
 *
 * 두 카드는 따로 부르고 따로 실패한다(카드 단위 격리). 둘 다 로그인해야 의미가 있어 **로그인 여부를 수화 뒤에** 본다
 * (`useHasAccessToken`) — 서버 렌더와 첫 클라이언트 렌더가 같아야 한다. 모르는 동안은 빈 자리, 로그아웃이면 없다
 * (시세 표는 공개라 표를 가리지 않는다).
 *
 * 새 화면이 아니다 — 진입점 원칙대로 투자 화면 카드다. 리서치의 [오늘의 판정](목표 비중 대비 할 일)은 비중 산식
 * (슬라이스 5)이 없어 아직 없다.
 */
export const JudgmentOverview = () => {
  const signedIn = useHasAccessToken();
  if (signedIn === null) return <div className={overviewPending} aria-hidden="true" />;
  if (!signedIn) return null;
  return (
    <div className={overviewGrid} role="region" aria-label={JUDGMENT_OVERVIEW_MESSAGES.regionLabel}>
      <RiskExposurePanel />
      <ScoreboardPanel />
    </div>
  );
};
