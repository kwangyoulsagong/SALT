"use client";

import type { ReportBehaviorFact } from "@repo/core/coach";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";
import { useState } from "react";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  formatGeneratedAt,
  KR_MIRROR_MESSAGES,
  KrMirrorLines,
  MIRROR_MESSAGES,
  MirrorLines,
  OutcomeList,
  useBehaviorMirror,
  useDecisionOutcomes,
  useKrBehaviorMirror,
} from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { OutcomeTagEditor } from "@/features/confirm-outcome-tags";
import { panel, panelDescription, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

const M = MIRROR_MESSAGES;
const K = KR_MIRROR_MESSAGES;

type MirrorAsset = "crypto" | "kr_stock";
const ASSETS: SegmentedOption<MirrorAsset>[] = [
  { label: M.assets.crypto, value: "crypto" },
  { label: M.assets.kr_stock, value: "kr_stock" },
];

const renderIdentity = (symbol: string, size: "sm" | "md") => <AssetIdentity symbol={symbol} size={size} />;

/** 청산별 태그 — 미러와 따로 부르고 따로 실패한다. 자산군마다 그 청산만 */
const OutcomeSection = ({ assetType }: { assetType: MirrorAsset }) => {
  const outcomes = useDecisionOutcomes(assetType);
  const body = () => {
    if (outcomes.isSignedOut) return null;
    if (outcomes.isPending) return <CoachBlockSkeleton block="zone" />;
    if (outcomes.isError || outcomes.data.status === "unavailable") {
      return <StatusLine kind="error">{M.outcomes.unavailable}</StatusLine>;
    }
    if (assetType === "kr_stock" && outcomes.data.outcomes.length === 0) {
      return <StatusLine kind="empty">{M.outcomes.empty}</StatusLine>;
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

const CryptoMirror = ({ behaviorFacts }: { behaviorFacts: readonly ReportBehaviorFact[] | null }) => {
  const mirror = useBehaviorMirror();
  const body = () => {
    if (mirror.isSignedOut) return <Text color="tertiary">{M.signedOut}</Text>;
    if (mirror.isPending) return <CoachBlockSkeleton block="zone" />;
    if (mirror.isError || mirror.data.status === "unavailable") return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    const view = mirror.data;
    const computedAt = view.outcomesComputedAt ? formatGeneratedAt(view.outcomesComputedAt) : null;
    return (
      <>
        {view.historyStatus === "truncated" && <Text color="tertiary">{M.truncated}</Text>}
        {view.outcomeCount === 0 && <StatusLine kind="empty">{M.empty}</StatusLine>}
        <MirrorLines view={view} behaviorFacts={behaviorFacts} />
        {computedAt && <p className={panelDescription}>{M.computedAt(computedAt)}</p>}
      </>
    );
  };
  return (
    <>
      <p className={panelDescription}>{M.description}</p>
      {body()}
      {!mirror.isSignedOut && <OutcomeSection assetType="crypto" />}
    </>
  );
};

const KrMirror = ({ mirror }: { mirror: ReturnType<typeof useKrBehaviorMirror> }) => {
  const body = () => {
    if (mirror.isPending) return <CoachBlockSkeleton block="zone" />;
    if (mirror.isError || mirror.data?.status !== "ok") return <StatusLine kind="error">{K.unavailable}</StatusLine>;
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
    <>
      <p className={panelDescription}>{K.description}</p>
      {body()}
      {mirror.data?.status === "ok" && mirror.data.outcomeCount > 0 && <OutcomeSection assetType="kr_stock" />}
    </>
  );
};

interface MirrorPanelProps {
  /** 최근 행동(FR-21). 리포트에서 온다 — 리포트가 없으면 `null` 이고 그 줄만 빠진다 */
  behaviorFacts: readonly ReportBehaviorFact[] | null;
}

/**
 * 내 매매 거울 — **코인 · 국내 두 벌을 한 패널로**(F017 v4 순서 6 · `FE-REQ-064` FR-12 "거울 두 벌 → 하나로").
 * 위 세그먼트가 자산군을 고른다 — 통계 · 창(코인 날 · 국내 거래일)이 달라 숫자를 섞지 않는다. 코치 리포트 안 섹션 하나(새 화면 0).
 *
 * - 코인(F009 시나리오 4 · `FE-REQ-039` FR-14~18): 행동 알림(과매매 · 패닉 · 추격)은 알림이 아니라 "최근 행동" 줄로 온다(FR-21)
 * - 국내(F011 FR-47 · `FE-REQ-041` FR-28): 서버 4xx · 로그아웃이면 국내 칸 자체가 없다(세그먼트도 없다 — 국내 시세 경로와 같은 규칙)
 * - 둘 다 따로 부르고 따로 실패한다(카드 단위 격리)
 */
export const MirrorPanel = ({ behaviorFacts }: MirrorPanelProps) => {
  const kr = useKrBehaviorMirror();
  const [asset, setAsset] = useState<MirrorAsset>("crypto");
  const hasKr = !kr.isSignedOut && !kr.notOwner;
  const shown = hasKr ? asset : "crypto";

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{M.heading}</h2>
        {hasKr && <SegmentedControl options={ASSETS} value={shown} onChange={setAsset} label={M.assets.label} />}
      </div>
      {shown === "crypto" ? <CryptoMirror behaviorFacts={behaviorFacts} /> : <KrMirror mirror={kr} />}
      <CoachDisclosure />
    </section>
  );
};
