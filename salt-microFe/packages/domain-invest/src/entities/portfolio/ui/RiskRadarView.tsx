import { FlexBox } from "@repo/ui/flexBox";
import { RadarChart } from "@repo/ui/radarChart";
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@repo/ui/table";
import { Text } from "@repo/ui/text";

import { POSITION_MESSAGES, RADAR_AXIS, type PositionRadarAxis } from "../model/position";
import { noWrap, radarLayout, reasonList, visuallyHidden } from "./position.css";

/**
 * 리스크 레이더 4축(F006 G절 FR-73 · `FE-REQ-030` FR-103) — 그림 + 축별 값/상한 표(차트는 표 대체를 둔다 — `a11y-policy.md`).
 * `value: null` 축은 "데이터 부족" — 0 점으로 그리지 않는다(FE-REQ-031 FR-92). 상한에 닿은 축은 사유 문구를 같이 — 색만으로 말하지 않는다
 */
export const RiskRadarView = ({ axes }: { axes: PositionRadarAxis[] }) => {
  const m = POSITION_MESSAGES.radar;
  const breached = axes.filter((axis) => axis.breached && axis.value !== null);
  const newsMissing = axes.some((axis) => axis.key === "news" && axis.value === null);

  return (
    <FlexBox direction="column" gap="md" fullWidth>
      <div className={radarLayout}>
        <RadarChart
          label={m.chartLabel}
          axes={axes.map((axis) => ({
            key: axis.key,
            label: RADAR_AXIS[axis.key].label,
            value: axis.value,
            limit: axis.limit,
            breached: axis.breached,
          }))}
        />
        <Table size="sm">
          <caption className={visuallyHidden}>{m.tableCaption}</caption>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{m.axis}</TableHeaderCell>
              <TableHeaderCell>{m.score}</TableHeaderCell>
              <TableHeaderCell>{m.limit}</TableHeaderCell>
              <TableHeaderCell>{m.measure}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {axes.map((axis) => (
              <TableRow key={axis.key}>
                <TableCell>
                  <span className={noWrap} title={RADAR_AXIS[axis.key].what}>{RADAR_AXIS[axis.key].label}</span>
                </TableCell>
                <TableCell>
                  {axis.value === null ? m.insufficient : `${axis.value.toFixed(0)} · ${axis.breached ? m.over : m.within}`}
                </TableCell>
                <TableCell>{axis.limit}</TableCell>
                <TableCell>{axis.raw === null ? "—" : RADAR_AXIS[axis.key].raw(axis.raw)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {breached.length > 0 ? (
        <ul className={reasonList}>
          {breached.map((axis) => (
            <li key={axis.key}>
              <Text>
                {axis.key === "concentration" && axis.subjectName && axis.raw !== null
                  ? m.concentrationReason(axis.subjectName, axis.raw, axis.limit)
                  : m.reason(RADAR_AXIS[axis.key].label, axis.value ?? 0, axis.limit)}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}
      <Text variant="caption" color="tertiary">{m.scaleNote}</Text>
      {newsMissing ? <Text variant="caption" color="tertiary">{m.newsNote}</Text> : null}
    </FlexBox>
  );
};
