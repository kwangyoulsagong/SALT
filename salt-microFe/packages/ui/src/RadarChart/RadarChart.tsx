import {
  radarGrid,
  radarLabel,
  radarLabelMissing,
  radarLimit,
  radarPoint,
  radarPointBreached,
  radarSvg,
  radarValue,
} from "./styles/radarChart.css";

export interface RadarAxisDatum {
  key: string;
  /** 축 이름(그림 바깥 글자) */
  label: string;
  /** 0 ~ `max`. 값이 없으면 `null` — 0 으로 그리지 않는다(점 없음 · 이름 흐림) */
  value: number | null;
  /** 상한 — 주면 점선 다각형으로 그린다 */
  limit?: number;
  /** 상한을 넘었다 — 점 색이 바뀐다. 색만으로 말하지 않게 부르는 쪽이 표 · 문구를 같이 둔다 */
  breached?: boolean;
}

export interface RadarChartProps {
  axes: readonly RadarAxisDatum[];
  /** 스크린 리더 이름. 값 요약은 그림 밖 표가 말한다(`a11y-policy.md` — 차트는 표 대체) */
  label: string;
  max?: number;
  /** 높이(px) — 폭은 좌우 축 이름 자리(72 × 2)만큼 더 넓다 */
  size?: number;
  /** 동심 격자 단계 수 */
  rings?: number;
}

/**
 * 레이더 차트 — 축 3개 이상. 값 다각형은 **모든 축에 값이 있을 때만** 잇는다 — 빈 축을 0 으로 접으면 모양이 거짓이 된다.
 * 하나라도 비면 점만 찍는다. 계산(점수화 · 상한 판정)은 부르는 쪽이 한다 — 이 컴포넌트는 받은 값을 그리기만 한다.
 */
export const RadarChart = ({ axes, label, max = 100, size = 240, rings = 4 }: RadarChartProps) => {
  if (axes.length < 3) return null;

  // 위아래는 글자 한 줄, 좌우는 축 이름 폭만큼 그림 밖에 자리를 둔다 — 좌우 이름이 그림 밖으로 넘쳐 옆 칸을 덮지 않게
  const pad = 28;
  const labelGutter = 72;
  const width = size + labelGutter * 2;
  const centerX = width / 2;
  const center = size / 2;
  const radius = center - pad;
  const angleOf = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
  const pointAt = (index: number, value: number) => {
    const r = (Math.max(0, Math.min(max, value)) / max) * radius;
    return [centerX + r * Math.cos(angleOf(index)), center + r * Math.sin(angleOf(index))] as const;
  };
  const polygon = (values: number[]) => values.map((v, i) => pointAt(i, v).map((n) => n.toFixed(2)).join(",")).join(" ");

  const complete = axes.every((axis) => axis.value !== null);
  const limits = axes.map((axis) => axis.limit);
  const hasLimits = limits.every((limit) => typeof limit === "number");

  return (
    <svg role="img" aria-label={label} width={width} height={size} viewBox={`0 0 ${width} ${size}`} className={radarSvg} style={{ maxWidth: width }}>
      {Array.from({ length: rings }, (_, ring) => (
        <polygon key={ring} className={radarGrid} points={polygon(axes.map(() => ((ring + 1) / rings) * max))} />
      ))}
      {axes.map((axis, index) => {
        const [x, y] = pointAt(index, max);
        return <line key={axis.key} className={radarGrid} x1={centerX} y1={center} x2={x} y2={y} />;
      })}
      {hasLimits ? <polygon className={radarLimit} points={polygon(limits as number[])} /> : null}
      {complete ? <polygon className={radarValue} points={polygon(axes.map((axis) => axis.value as number))} /> : null}
      {axes.map((axis, index) => {
        if (axis.value === null) return null;
        const [x, y] = pointAt(index, axis.value);
        return <circle key={axis.key} cx={x} cy={y} r={axis.breached ? 4.5 : 3.5} className={axis.breached ? radarPointBreached : radarPoint} />;
      })}
      {axes.map((axis, index) => {
        const angle = angleOf(index);
        const x = centerX + (radius + 12) * Math.cos(angle);
        const y = center + (radius + 12) * Math.sin(angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className={axis.value === null ? `${radarLabel} ${radarLabelMissing}` : radarLabel}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
};
