"use client";

import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";
import { memo, useMemo } from "react";

import {
  COACH_MESSAGES,
  CoachBlockSkeleton,
  findGaugeTrackRecord,
  GaugeTrackRecordLine,
  JudgmentSummary,
  selectModeView,
  useSymbolCoach,
  ZoneSummary,
} from "@/entities/coach";
import {
  type GaugeFooters,
  MarketPreview,
  type MarketPreviewSubject,
} from "@/entities/market";
import { CoachModeSwitch, useCoachModeParam } from "@/features/switch-coach-mode";

import { coachBlocks, modeRow } from "./CoachPanel.css";

interface CoachPanelProps {
  subject: MarketPreviewSubject | undefined;
}

/** ②③ — 판단이 막혀도 구간은 그린다(FR-117) */
const JudgmentAndZone = ({
  view,
  mode,
}: {
  view: SymbolCoachViewModel;
  mode: CoachMode;
}) => {
  const modeView = selectModeView(view, mode);
  return (
    <>
      <Heading level={5} color="tertiary">
        {COACH_MESSAGES.judgmentHeading}
      </Heading>
      <JudgmentSummary view={modeView} mode={mode} />
      {modeView && <ZoneSummary zone={modeView.zone} />}
    </>
  );
};

/**
 * 투자 화면 우측 AI 코치 패널 (`FE-REQ-026` K · FR-110~121).
 *
 * 시세 프리뷰(`MarketPreview`)를 **그대로** 쓰고, 그 슬롯에 ①②③ 과 게이지 아래 한 줄을
 * 끼운다. 차트 · 게이지 · 뉴스는 이 패널의 조회를 기다리지 않는다(`FE-REQ-029` FR-72) —
 * 판단 자리만 스켈레톤이다.
 *
 * 조회는 종목당 한 번이고 두 모드가 같이 온다. 모드 전환은 같은 응답을 다르게 읽을
 * 뿐이라 요청이 없다(FR-112). 행을 옮기면 이전 요청은 React Query 가 끊고, BFF 가
 * 서버 요청까지 끊는다(`BFF-REQ-026` FR-52).
 *
 * `aria-live` 를 쓰지 않는다 — 행을 옮길 때마다 판단을 낭독하면 표를 훑을 수 없다(FR-121).
 *
 * ⑦ [상세 분석 보기] 는 아직 없다 — 이동할 `/investments/[symbol]`(FR-130~)이 없다.
 */
export const CoachPanel = memo(({ subject }: CoachPanelProps) => {
  const { data, isPending, isError, isSignedOut } = useSymbolCoach(subject?.symbol);
  const [mode, setMode] = useCoachModeParam(data?.mode);

  const gaugeFooters = useMemo<GaugeFooters | undefined>(() => {
    if (!data) return undefined;
    const sentiment = findGaugeTrackRecord(data.gaugeTrackRecords, "sentiment");
    const smartMoney = findGaugeTrackRecord(data.gaugeTrackRecords, "smart_money");
    return {
      sentiment: sentiment && <GaugeTrackRecordLine record={sentiment} />,
      smartMoney: smartMoney && <GaugeTrackRecordLine record={smartMoney} />,
    };
  }, [data]);

  const renderBlocks = () => {
    if (isSignedOut) return <Text color="tertiary">{COACH_MESSAGES.signedOut}</Text>;
    if (isError) {
      return <Text color="tertiary">{COACH_MESSAGES.judgmentUnavailable}</Text>;
    }
    if (isPending || !data || !mode) {
      return (
        <>
          <div className={modeRow} />
          <CoachBlockSkeleton block="judgment" />
          <CoachBlockSkeleton block="zone" />
        </>
      );
    }
    return (
      <>
        <div className={modeRow}>
          <CoachModeSwitch value={mode} onChange={setMode} />
        </div>
        <JudgmentAndZone view={data} mode={mode} />
      </>
    );
  };

  return (
    <MarketPreview
      subject={subject}
      coachSlot={<div className={coachBlocks}>{renderBlocks()}</div>}
      gaugeFooters={gaugeFooters}
    />
  );
});

CoachPanel.displayName = "CoachPanel";

export default CoachPanel;
