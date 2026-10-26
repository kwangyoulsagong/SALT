"use client";

import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  formatGeneratedAt,
  KR_MIRROR_MESSAGES,
  KrMirrorLines,
  MIRROR_MESSAGES,
  OutcomeList,
  useDecisionOutcomes,
  useKrBehaviorMirror,
} from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { OutcomeTagEditor } from "@/features/confirm-outcome-tags";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

const K = KR_MIRROR_MESSAGES;
const M = MIRROR_MESSAGES;

const renderIdentity = (symbol: string, size: "sm" | "md") => <AssetIdentity symbol={symbol} size={size} />;

/** 국내 청산별 태그 — 코인 미러의 목록과 같은 모양, 국내 청산만. 미러와 따로 부르고 따로 실패한다 */
const KrOutcomeSection = () => {
  const outcomes = useDecisionOutcomes("kr_stock");
  const body = () => {
    if (outcomes.isPending) return <CoachBlockSkeleton block="zone" />;
    if (outcomes.isError || outcomes.data.status === "unavailable") {
      return <StatusLine kind="error">{M.outcomes.unavailable}</StatusLine>;
    }
    if (outcomes.data.outcomes.length === 0) return <StatusLine kind="empty">{M.outcomes.empty}</StatusLine>;
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

/**
 * 국내 주식 거래 미러 (F011 FR-47 · `FE-REQ-041` FR-28). 코인 미러 바로 아래 섹션 하나 — 새 화면 0개.
 *
 * 소유자 전용이라 비소유자(404) · 로그아웃이면 **섹션 자체가 없다**(안내 문구도 없다 — 국내 시세 경로와 같은 규칙).
 * 코인 미러와 따로 부르고 따로 실패한다.
 */
export const KrMirrorPanel = () => {
  const mirror = useKrBehaviorMirror();
  if (mirror.isSignedOut || mirror.notOwner) return null;

  const body = () => {
    if (mirror.isPending) return <CoachBlockSkeleton block="zone" />;
    if (mirror.isError || mirror.data.status === "unavailable") return <StatusLine kind="error">{K.unavailable}</StatusLine>;
    const view = mirror.data;
    if (view.historyStatus === "truncated") return <Text color="tertiary">{K.truncated}</Text>;
    if (view.tradeCount === 0) return <StatusLine kind="empty">{K.empty}</StatusLine>;
    const computedAt = view.outcomesComputedAt ? formatGeneratedAt(view.outcomesComputedAt) : null;
    return (
      <>
        <KrMirrorLines view={view} />
        {computedAt && <p className={panelDescription}>{M.computedAt(computedAt)}</p>}
      </>
    );
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{K.heading}</h2>
      </div>
      <p className={panelDescription}>{K.description}</p>
      {body()}
      {mirror.data?.status === "ok" && mirror.data.outcomeCount > 0 && <KrOutcomeSection />}
      <CoachDisclosure />
    </section>
  );
};
