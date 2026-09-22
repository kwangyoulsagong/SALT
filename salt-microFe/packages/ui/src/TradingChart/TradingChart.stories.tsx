import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TradingChart } from "./TradingChart";
import type { TradingCandle } from "./types";

/** 결정적 가짜 봉 — 같은 스토리가 매번 같은 모양이다(시각 회귀) */
const makeCandles = (count: number, stepMs: number, start: number, base: number): TradingCandle[] => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const out: TradingCandle[] = [];
  let close = base;
  for (let i = 0; i < count; i += 1) {
    const open = close;
    close = Math.max(1, open * (1 + (rand() - 0.48) * 0.04));
    const high = Math.max(open, close) * (1 + rand() * 0.015);
    const low = Math.min(open, close) * (1 - rand() * 0.015);
    out.push({ time: start + i * stepMs, open, high, low, close, volume: 1e6 * (0.3 + rand() * 2) });
  }
  return out;
};

const DAY = 86_400_000;
const DAILY = makeCandles(200, DAY, Date.UTC(2025, 11, 1) - 9 * 3_600_000, 950_000);
const MINUTES = makeCandles(200, 5 * 60_000, Date.UTC(2026, 8, 21, 13, 0), 115_000_000);
const last = DAILY[DAILY.length - 1]!.close;

const meta = {
  title: "Charts/TradingChart",
  component: TradingChart,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { height: 420, intraday: false, name: "예시 종목 일봉", candles: DAILY },
} satisfies Meta<typeof TradingChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 일봉 200개 · 이동평균 4개 · 거래량 · 월 라벨 */
export const Default: Story = {};

/** 5분봉 — 시:분 라벨, 날이 바뀌면 날짜 */
export const Intraday: Story = {
  args: { candles: MINUTES, intraday: true, name: "예시 종목 5분봉" },
};

/** 가격선 — 범위 안은 선 + 배지, 범위 밖은 가장자리 화살표(캔들을 납작하게 만들지 않는다) */
export const WithPriceLines: Story = {
  args: {
    priceLines: [
      { key: "protect", price: last * 0.93, tone: "down", dashed: false, label: "손실 제한" },
      { key: "first", price: last * 1.02, tone: "neutral", dashed: true, label: "1차 검토" },
      { key: "far", price: last * 3, tone: "neutral", dashed: false, label: "먼 선" },
    ],
  },
};

/** 봉이 없을 때 — 높이를 지키고 안내 한 줄 */
export const Empty: Story = { args: { candles: [] } };

/** 1000봉 — 성능 측정용(서버 상한은 200). 포인터 이동 · 확대가 봉 수와 무관한지 본다 */
export const Dense: Story = {
  args: { candles: makeCandles(1000, DAY, Date.UTC(2023, 0, 1), 950_000), name: "예시 종목 1000봉" },
};
