import {
  barStyles,
  columnStyles,
  labelStyles,
  plotStyles,
  srOnlyStyles,
  valueStyles,
  wrapperStyles,
} from "./styles/barChart.css";

export type BarTone = "brand" | "up" | "down" | "neutral" | "ai";

export interface BarChartItem {
  label: string;
  value: number;
  tone?: BarTone;
}

export interface BarChartProps {
  items: BarChartItem[];
  /** 차트가 무엇인지. 표 캡션과 accessible name으로 쓰인다. */
  label: string;
  /** 막대 영역 높이(px) */
  height?: number;
  /** 최댓값을 고정한다. 없으면 데이터 최댓값을 100%로 잡는다. */
  max?: number;
  /** 막대 위에 값을 표시한다. */
  showValues?: boolean;
  format?: (value: number) => string;
  className?: string;
}

/**
 * 기간·자산군 비교용 막대 차트.
 * 시세 캔들은 `PreviewChart`, 칩 안 추세선은 `Sparkline`을 쓴다.
 */
export const BarChart = ({
  items,
  label,
  height = 140,
  max,
  showValues = false,
  format,
  className,
}: BarChartProps) => {
  const peak = max ?? Math.max(...items.map((item) => item.value), 0);
  const toText = (value: number) =>
    format ? format(value) : value.toLocaleString("ko-KR");

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      <div className={plotStyles} style={{ height }} aria-hidden="true">
        {items.map((item) => {
          const ratio = peak === 0 ? 0 : Math.max(0, item.value) / peak;

          return (
            <div key={item.label} className={columnStyles}>
              {showValues ? (
                <span className={valueStyles}>{toText(item.value)}</span>
              ) : null}
              <div
                className={barStyles({ tone: item.tone || "brand" })}
                style={{ height: `${(ratio * 100).toFixed(2)}%` }}
              />
              <span className={labelStyles}>{item.label}</span>
            </div>
          );
        })}
      </div>

      <table className={srOnlyStyles}>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">값</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{toText(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
