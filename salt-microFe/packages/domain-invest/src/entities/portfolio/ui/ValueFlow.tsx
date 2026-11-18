"use client";

// 클라이언트 잎: 차트 폭을 칸 폭에 맞춘다(`useElementWidth`) · 기간 버튼은 받은 콜백만 부른다(표시 전용).
import { FlexBox } from "@repo/ui/flexBox";
import { KeyValueList } from "@repo/ui/keyValueList";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { Sparkline } from "@repo/ui/sparkline";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { useElementWidth } from "@repo/web-shared/lib";

import {
  FLOW_RANGES,
  POSITION_MESSAGES,
  formatSignedPct,
  type FlowRange,
  type PositionFlowVM,
} from "../model/position";
import { chartBox, pairGrid } from "./position.css";

interface ValueFlowProps {
  range: FlowRange;
  onRangeChange: (range: FlowRange) => void;
  flow: PositionFlowVM | undefined;
  isError: boolean;
  /** 앞 기간 그림을 보여 주는 중(새 기간을 받는 중) */
  isStale: boolean;
}

const CHART_HEIGHT = 120;

/**
 * 평가금 흐름(F006 G절 FR-71 · `FE-REQ-030` FR-101) — 기간 4 + 기간 최대 낙폭. 선은 평가금(실제 금액), 숫자는 시간가중 지수다 —
 * 두 뜻이 다르다는 것을 아래 한 줄이 말한다. 점이 2개 미만이면 선을 그리지 않는다(0 으로 그리지 않는다)
 */
export const ValueFlow = ({
  range,
  onRangeChange,
  flow,
  isError,
  isStale,
}: ValueFlowProps) => {
  const m = POSITION_MESSAGES.flow;
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const rangeLabel = FLOW_RANGES.find((r) => r.value === range)?.label ?? range;
  const points = flow?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];

  // 폭을 재는 칸은 늘 붙어 있어야 한다 — 데이터가 온 뒤에 붙이면 훅이 첫 값(320)으로 굳는다(2026-11-18 실화면)
  return (
    <div ref={ref}>
      <FlexBox direction="column" gap="md" fullWidth>
        <SegmentedControl
          options={[...FLOW_RANGES]}
          value={range}
          onChange={onRangeChange}
          label={m.rangeLabel}
        />
        {isError && !flow ? (
          <StatusLine kind="error">
            {POSITION_MESSAGES.flowLoadFailed}
          </StatusLine>
        ) : !flow ? (
          <div className={chartBox} aria-busy="true" />
        ) : (
          <>
            <div className={chartBox} aria-busy={isStale}>
              {first && last && points.length >= 2 ? (
                <Sparkline
                  points={points.map((p) => p.valueKrw)}
                  width={width}
                  height={CHART_HEIGHT}
                  area
                  tone="brand"
                  label={m.chartLabel(rangeLabel, first.date, last.date)}
                />
              ) : (
                <Text color="tertiary">{m.empty}</Text>
              )}
            </div>
            <div className={pairGrid}>
              <KeyValueList
                items={[
                  {
                    label: m.mdd,
                    value: flow.maxDrawdown
                      ? `${formatSignedPct(flow.maxDrawdown.pct)} · ${m.mddRange(flow.maxDrawdown.peakDate, flow.maxDrawdown.troughDate)}`
                      : m.mddNone,
                    tone:
                      flow.maxDrawdown && flow.maxDrawdown.pct < 0
                        ? "down"
                        : "muted",
                  },
                ]}
              />
              <KeyValueList
                items={[
                  {
                    label: m.periodReturn,
                    value:
                      flow.periodReturnPct === null
                        ? m.mddNone
                        : formatSignedPct(flow.periodReturnPct),
                    tone:
                      flow.periodReturnPct === null
                        ? "muted"
                        : flow.periodReturnPct > 0
                          ? "up"
                          : flow.periodReturnPct < 0
                            ? "down"
                            : "default",
                  },
                ]}
              />
            </div>
            <Text variant="caption" color="tertiary">
              {m.note}
            </Text>
            {flow.missingSymbols.length > 0 ? (
              <StatusLine kind="blocked">
                {m.missing(flow.missingSymbols.join(", "))}
              </StatusLine>
            ) : null}
          </>
        )}
      </FlexBox>
    </div>
  );
};
