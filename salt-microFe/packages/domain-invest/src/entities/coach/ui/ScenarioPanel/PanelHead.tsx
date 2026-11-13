"use client";

import type { ScenarioHorizonKey, ScenarioHorizonView } from "@repo/core/coach";
import { kstClock, kstMonthDay } from "@repo/core/marketKr";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";

import { PANEL_MESSAGES as P, SCENARIO_MESSAGES as M } from "../../model";
import * as h from "./ScenarioHeadline.css";
import * as s from "./ScenarioPanel.css";

const HORIZON_KEYS = ["1h", "4h", "1d", "5d"] as const;
const HORIZONS: SegmentedOption<ScenarioHorizonKey>[] = HORIZON_KEYS.map((key) => ({ label: M.horizons[key], value: key }));

/** 패널이 처음 여는 기간 — 기록이 가장 많은 하루 */
export const PANEL_DEFAULT_HORIZON: ScenarioHorizonKey = "1d";

interface PanelHeadProps {
  /** 고른 기간의 칸 — 출처 칩 · 기준 시각. 아직 없으면 이름만 */
  view: ScenarioHorizonView | undefined;
  horizon: ScenarioHorizonKey;
  onHorizon: (next: ScenarioHorizonKey) => void;
}

/**
 * 패널 머리 — 이름 칩 · AI 표시 · 출처("과거 실제 결과" · "모델 확률") · 기준 시각 + 기간 탭 넷(시안 §6 · `FE-REQ-064` FR-8).
 * 기간 탭이 단타/장기 스위치를 대신한다 — 탭이 고른 모드는 서버 `horizonMode` 가 정한다(여기는 고른 값만 올린다)
 */
export const PanelHead = ({ view, horizon, onHorizon }: PanelHeadProps) => (
  <>
    <div className={s.headRow}>
      <h2 className={s.title}>{P.heading}</h2>
      <span className={s.aiMark}>
        <span aria-hidden="true">{P.ai}</span>
        <span className={s.srOnly}>{P.aiSr}</span>
      </span>
      {view && view.tier !== "defect" && <span className={h.sourceChip}>{M.source[view.source]}</span>}
      {view?.asOf && <span className={s.asOf}>{M.asOf(`${kstMonthDay(view.asOf)} ${kstClock(view.asOf)}`)}</span>}
    </div>
    <SegmentedControl options={HORIZONS} value={horizon} onChange={onHorizon} label={M.horizonGroupLabel} />
  </>
);
