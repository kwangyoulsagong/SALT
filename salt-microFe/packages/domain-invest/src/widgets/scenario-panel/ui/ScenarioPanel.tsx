"use client";

import type { ScenarioHorizonKey } from "@repo/core/coach";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  coachQueryKeys,
  CompanyRow,
  InvalidationRow,
  MineLine,
  PANEL_DEFAULT_HORIZON,
  PANEL_MESSAGES as M,
  PanelHead,
  PanelRow,
  ScenarioFan,
  ScenarioHeadline,
  TrackRow,
  useCoachPanel,
} from "@/entities/coach";
import { MoveCauseFlow, useKrChart, useMarketChart, useMarketChartPreview } from "@/entities/market";
import { TradeCheckCard } from "@/features/check-trade-odds";
import { StreamedExplanation } from "@/features/stream-explanation";

import { scenarioPanel, scenarioPanelLoading, scenarioPanelNote } from "./ScenarioPanel.css";

/** 과거 가격 선의 봉 수 — 시안 판 폭(지금 점 왼쪽 절반)에 30봉 */
const PAST_BARS = 30;

/** 숫자가 속한 기간의 봉 — 하루 · 닷새는 일봉, 1시간 · 4시간은 5분봉(지금은 하루 값으로 대신하니 일봉) */
const usesShortBars = (key: ScenarioHorizonKey) => key === "1h" || key === "4h";

/** 지난 종가(오래된 → 최근) — 자산군 · 기간에 맞는 조회 하나만 켠다 */
const usePastCloses = (asset: "crypto" | "kr", symbol: string, short: boolean): number[] => {
  const cryptoDaily = useMarketChart(asset === "crypto" && !short ? symbol : "", "1d");
  const cryptoShort = useMarketChartPreview(asset === "crypto" && short ? symbol : "");
  const krDaily = useKrChart(asset === "kr" && !short ? symbol : "", "1d", PAST_BARS);
  const krShort = useKrChart(asset === "kr" && short ? symbol : "", "5m", PAST_BARS);
  if (asset === "crypto") {
    const rows = (short ? cryptoShort.data?.data : cryptoDaily.data?.data) ?? [];
    return rows.slice(-PAST_BARS).map((r) => r.close);
  }
  const chart = short ? krShort.data : krDaily.data;
  return chart?.status === "ok" ? chart.candles.slice(-PAST_BARS).map((c) => c.close) : [];
};

interface ScenarioPanelProps {
  symbol: string;
  asset: "crypto" | "kr";
  className?: string;
}

/**
 * 한 장 패널 — 종목 상세 AI 칸을 한 장으로(F017 v4 순서 1e · `FE-REQ-064` FR-8~11 · 시안 `pm/docs/2026-11-13-one-panel-research.html` §6).
 *
 * 위에서 아래: 머리(이름 · AI · 출처 · 기준 시각) → 기간 탭 → 큰 숫자 · 막대 → 부채꼴 → 줄 다섯
 * (보통은 = 사기 전 · 팔기 전 점검 · 왜 움직였나 = 원인 → 근거 → 결과 · 회사 사정 · 틀리는 때 · 성적) → AI 해설 → 내 기준.
 *
 * - 데이터는 BFF 한 콜(`useCoachPanel`). 칸마다 `status` — 한 칸이 결함이어도 나머지는 그린다
 * - 기간 탭이 단타/장기를 고른다 — 그 표(`horizonMode`)는 서버 값
 * - 점검 칸은 기능 그대로(방향 전환 · 펼침) — 사기 전 응답은 패널 응답으로 캐시를 채워 두 번 부르지 않는다
 * - 면책은 패널 아래 한 번
 */
export const ScenarioPanel = ({ symbol, asset, className }: ScenarioPanelProps) => {
  const [horizon, setHorizon] = useState<ScenarioHorizonKey>(PANEL_DEFAULT_HORIZON);
  const panel = useCoachPanel(symbol);
  const queryClient = useQueryClient();
  const data = panel.data;
  const view = data?.scenario.horizons.find((h) => h.horizon === horizon);
  const closes = usePastCloses(asset, symbol, usesShortBars(view?.fallbackFrom ?? horizon));

  // 사기 전 점검은 패널이 이미 받았다 — 점검 칸이 같은 요청을 다시 내지 않게(값이 없을 때만 채운다)
  const buyCheck = data?.verdict.check ?? null;
  useEffect(() => {
    if (!buyCheck) return;
    const key = coachQueryKeys.tradeCheck(symbol, "buy");
    if (queryClient.getQueryData(key) === undefined) queryClient.setQueryData(key, buyCheck);
  }, [buyCheck, queryClient, symbol]);

  const shell = `${className ?? ""} ${scenarioPanel}`;
  if (panel.isSignedOut) return null;
  if (panel.isError) {
    return (
      <section className={shell} aria-label={M.heading}>
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      </section>
    );
  }
  if (!data) {
    return (
      <section className={`${shell} ${scenarioPanelLoading}`} aria-label={M.heading} aria-busy="true">
        <PanelHead view={undefined} horizon={horizon} onHorizon={setHorizon} />
        <Skeleton lines={10} />
      </section>
    );
  }

  const mode = data.horizonMode[horizon] === "scalp" ? data.modes.scalp : data.modes.longTerm;
  return (
    <section className={shell} aria-label={M.heading}>
      <PanelHead view={view} horizon={horizon} onHorizon={setHorizon} />
      {view ? <ScenarioHeadline view={view} /> : <p>{M.cellUnavailable}</p>}
      {view && view.tier !== "defect" && view.range && <ScenarioFan closes={closes} range={view.range} />}

      <PanelRow kind="usual">
        <TradeCheckCard symbol={symbol} bare />
      </PanelRow>
      <PanelRow kind="cause">
        {data.cause.cause ? <MoveCauseFlow view={data.cause.cause} /> : <StatusLine kind="error">{M.causeDefect}</StatusLine>}
      </PanelRow>
      <CompanyRow company={data.company} />
      {view ? <InvalidationRow view={view} /> : null}
      <TrackRow track={mode.track} />

      {mode.explanation.view ? (
        // 최신 AI 저장본이면 그대로, 아니면 스트림(F017 v4 1f) — 기간 탭이 모드를 바꾸면 새로 연다
        <StreamedExplanation key={mode.mode} symbol={symbol} mode={mode.mode} stored={mode.explanation.view} />
      ) : (
        <StatusLine kind="error">{M.explainDefect}</StatusLine>
      )}
      {data.mine && <MineLine mine={data.mine} />}
      {data.scenario.disclaimer && <p className={scenarioPanelNote}>{data.scenario.disclaimer}</p>}
    </section>
  );
};
