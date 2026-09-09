import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sparkline } from "./Sparkline";
import { NumberText } from "../NumberText/NumberText";

const rising = [100, 102, 101, 105, 104, 108, 112];
const falling = [112, 108, 109, 104, 105, 101, 98];
const flat = [100, 100, 100, 100, 100];

const meta = {
  title: "Components/Sparkline",
  component: Sparkline,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: ["auto", "up", "down", "neutral", "brand"],
      description: "선 색. auto는 첫 값과 끝 값을 비교해 정한다",
    },
    width: {
      control: "number",
      description: "너비(px)",
    },
    height: {
      control: "number",
      description: "높이(px)",
    },
    label: {
      control: "text",
      description: "스크린 리더가 읽을 이름. 추세도 문구에 담는다",
    },
  },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    points: rising,
    label: "코스피 최근 7일 추세, 상승",
  },
};

export const AllTones: Story = {
  args: { points: rising, label: "" },
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Sparkline points={rising} label="상승 추세" />
      <Sparkline points={falling} label="하락 추세" />
      <Sparkline points={flat} label="보합" />
      <Sparkline points={rising} tone="brand" label="브랜드 색 추세" />
    </div>
  ),
};

/** 지수 칩 — 이름·수치·추세선을 한 줄로 묶는다. */
export const IndexChip: Story = {
  args: { points: rising, label: "" },
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      {[
        { name: "코스피", change: 0.82, points: rising },
        { name: "코스닥", change: -1.24, points: falling },
      ].map((index) => (
        <div
          key={index.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            border: "1px solid #E5E8EB",
            borderRadius: 12,
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <span style={{ fontSize: 13, color: "#8B95A1" }}>{index.name}</span>
            <NumberText value={index.change} unit="%" size="t7" signed />
          </div>
          <Sparkline
            points={index.points}
            label={`${index.name} 추세`}
            width={48}
            height={20}
          />
        </div>
      ))}
    </div>
  ),
};

/** 값이 모두 같으면 가운데 수평선을 그린다. */
export const FlatSeries: Story = {
  args: {
    points: flat,
    label: "보합",
  },
};

/** 점이 2개 미만이면 아무것도 그리지 않는다. */
export const NotEnoughPoints: Story = {
  args: {
    points: [100],
    label: "데이터 부족",
  },
};

export const Large: Story = {
  args: {
    points: rising,
    label: "큰 추세선",
    width: 160,
    height: 48,
    strokeWidth: 2,
  },
};
