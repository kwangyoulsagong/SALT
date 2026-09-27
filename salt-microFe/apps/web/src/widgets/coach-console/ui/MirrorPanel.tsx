"use client";

import type { ReportBehaviorFact } from "@repo/core/coach";
import { Text } from "@repo/ui/text";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  formatGeneratedAt,
  MIRROR_MESSAGES,
  MirrorLines,
  OutcomeList,
  useBehaviorMirror,
  useDecisionOutcomes,
} from "@/entities/coach";
import { OutcomeTagEditor } from "@/features/confirm-outcome-tags";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { AssetIdentity } from "./AssetIdentity";

const M = MIRROR_MESSAGES;

const renderIdentity = (symbol: string, size: "sm" | "md") => <AssetIdentity symbol={symbol} size={size} />;

/** 청산별 태그 — 미러와 따로 부르고 따로 실패한다 */
const OutcomeSection = () => {
  const outcomes = useDecisionOutcomes();
  const body = () => {
    if (outcomes.isSignedOut) return null;
    if (outcomes.isPending) return <CoachBlockSkeleton block="zone" />;
    if (outcomes.isError || outcomes.data.status === "unavailable") {
      return <Text color="tertiary">{M.outcomes.unavailable}</Text>;
    }
    return (
      <OutcomeList
        outcomes={outcomes.data.outcomes}
        renderIdentity={renderIdentity}
        renderTags={(outcome) => <OutcomeTagEditor outcome={outcome} />}
      />
    );
  };

  return (
    <>
      <div className={panelHead}>
        <h3 className={panelTitle}>{M.outcomes.heading}</h3>
      </div>
      <p className={panelDescription}>{M.outcomes.description}</p>
      {body()}
    </>
  );
};

interface MirrorPanelProps {
  /** 최근 행동(FR-21). 리포트에서 온다 — 리포트가 없으면 `null` 이고 그 줄만 빠진다 */
  behaviorFacts: readonly ReportBehaviorFact[] | null;
}

/**
 * 내 거래 미러 (F009 시나리오 4 · FR-12 · FR-15~21 · `FE-REQ-039` FR-14~18).
 *
 * 코치 리포트 안 섹션 하나다 — 새 화면 0개. 리포트 · 게이지와 따로 부르고 따로 실패한다(카드 단위 격리).
 * 행동 알림(과매매 · 패닉 · 추격)은 알림이 아니라 여기 "최근 행동" 줄로 온다(FR-21).
 */
export const MirrorPanel = ({ behaviorFacts }: MirrorPanelProps) => {
  const mirror = useBehaviorMirror();

  const body = () => {
    if (mirror.isSignedOut) return <Text color="tertiary">{M.signedOut}</Text>;
    if (mirror.isPending) return <CoachBlockSkeleton block="zone" />;
    if (mirror.isError || mirror.data.status === "unavailable") return <Text color="tertiary">{M.unavailable}</Text>;

    const view = mirror.data;
    const computedAt = view.outcomesComputedAt ? formatGeneratedAt(view.outcomesComputedAt) : null;
    return (
      <>
        {view.historyStatus === "truncated" && <Text color="tertiary">{M.truncated}</Text>}
        {view.outcomeCount === 0 && <Text color="tertiary">{M.empty}</Text>}
        <MirrorLines view={view} behaviorFacts={behaviorFacts} />
        {computedAt && <p className={panelDescription}>{M.computedAt(computedAt)}</p>}
      </>
    );
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{M.heading}</h2>
      </div>
      <p className={panelDescription}>{M.description}</p>
      {body()}
      {!mirror.isSignedOut && <OutcomeSection />}
      <CoachDisclosure />
    </section>
  );
};
