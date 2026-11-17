"use client";

import { Heading } from "@repo/ui/heading";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import Link from "next/link";
import { memo, useMemo } from "react";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron, SignInRequired } from "@repo/web-shared/ui";

import {
  COACH_MESSAGES,
  invalidationToPriceLines,
  PANEL_DEFAULT_HORIZON,
  PANEL_MESSAGES,
  ScenarioHeadline,
  SCENARIO_MESSAGES,
  useCoachPanel,
} from "@/entities/coach";
import {
  type MarketChartOverlay,
  MarketPreview,
  MoveCauseFlow,
  type MarketPreviewSubject,
} from "@/entities/market";

import { PREVIEW_MESSAGES as M } from "../model";
import { coachBlocks, moreLink, trackLine } from "./CoachPanel.css";

interface CoachPanelProps {
  subject: MarketPreviewSubject | undefined;
}

/**
 * 투자 화면 우측 미리보기(`FE-REQ-026` K · F017 v4 순서 6 `FE-REQ-064` FR-12 · 시안 "바뀐 뒤 · 오른쪽 패널").
 *
 * 시세 프리뷰(`MarketPreview`)를 그대로 쓰고 그 자리에 한 장 패널 응답(`useCoachPanel` — 종목 상세와 같은 쿼리)의 세 칸만 끼운다:
 * 머리 아래 **원인 → 근거 → 결과**(늘 — 소식 없는 날도 "확인된 소식이 없어요") · 차트 위 **틀리는 선** · 차트 아래 **시나리오 한 칸**(하루 ·
 * 성적 한 줄) → 자세히 보기. 오늘 소식은 프리뷰 몫.
 *
 * 빠진 것(계산은 서버에 남는다 — 사용자 확정 2026-11-13): 단타/장기 탭 · 점수와 메타 줄 · 관찰 구간 표 · 점검 점 그림(→ 시나리오 숫자) ·
 * 시장 심리 온도계 · 스마트 머니 추적 · 거래소 주의 줄(원인 칸 · 판단 꼬리표로).
 *
 * `aria-live` 를 쓰지 않는다 — 행을 옮길 때마다 낭독하면 표를 훑을 수 없다(FR-121). 상세 이동은 표 행 클릭 · "자세히 보기"
 */
export const CoachPanel = memo(({ subject }: CoachPanelProps) => {
  const panel = useCoachPanel(subject?.symbol ?? "");
  const data = panel.data;
  const day = data?.scenario.horizons.find((h) => h.horizon === PANEL_DEFAULT_HORIZON);
  const mode = data ? (data.horizonMode[PANEL_DEFAULT_HORIZON] === "scalp" ? data.modes.scalp : data.modes.longTerm) : null;

  // 차트 위 틀리는 선 하나 — 상세 패널 ④ 줄과 같은 칸(하루). 관찰 구간 띠는 뺐다
  const chartOverlay = useMemo<MarketChartOverlay | undefined>(
    () => (day ? { priceLines: invalidationToPriceLines(day), priceBand: null } : undefined),
    [day],
  );

  if (!subject) return <MarketPreview subject={undefined} />;

  const cause =
    panel.isSignedOut || panel.isError ? null : (
      <section className={coachBlocks} aria-label={PANEL_MESSAGES.rows.cause}>
        <Heading level={5} as={4} color="secondary">
          {PANEL_MESSAGES.rows.cause}
        </Heading>
        {!data ? (
          <Skeleton lines={3} />
        ) : data.cause.cause ? (
          <MoveCauseFlow view={data.cause.cause} />
        ) : (
          <StatusLine kind="error">{PANEL_MESSAGES.causeDefect}</StatusLine>
        )}
      </section>
    );

  const scenario = () => {
    // 판단 · 시나리오는 AI 칸 — 유리막(`FE-REQ-070`)
    if (panel.isSignedOut) return <SignInRequired what={COACH_MESSAGES.guestWhat} minHeight={160}>{null}</SignInRequired>;
    if (panel.isError) return <StatusLine kind="error">{PANEL_MESSAGES.unavailable}</StatusLine>;
    if (!data || !mode) return <Skeleton lines={5} />;
    const track = mode.track;
    return (
      <>
        <Heading level={5} as={4} color="secondary">
          {M.scenarioHeading(SCENARIO_MESSAGES.horizons[PANEL_DEFAULT_HORIZON], day && day.tier !== "defect" ? SCENARIO_MESSAGES.source[day.source] : null)}
        </Heading>
        {day ? <ScenarioHeadline view={day} /> : <StatusLine kind="error">{PANEL_MESSAGES.cellUnavailable}</StatusLine>}
        <p className={trackLine}>
          {track.tier === "defect" || track.hitOutOf100 === null
            ? PANEL_MESSAGES.trackDefect(track.sample.toLocaleString("ko-KR"))
            : `${PANEL_MESSAGES.trackThis} · ${PANEL_MESSAGES.trackLine(track.hitOutOf100, track.baselineOutOf100)}`}
        </p>
      </>
    );
  };

  return (
    <MarketPreview
      subject={subject}
      causeSlot={cause}
      chartOverlay={chartOverlay}
      coachSlot={
        <div className={coachBlocks}>
          {scenario()}
          <Link
            href={ROUTES.investmentDetail(subject.symbol)}
            prefetch={false}
            className={moreLink}
            aria-label={M.moreLabel(subject.displayName)}
          >
            {M.more}
            <NavChevron />
          </Link>
        </div>
      }
    />
  );
});

CoachPanel.displayName = "CoachPanel";

export default CoachPanel;
