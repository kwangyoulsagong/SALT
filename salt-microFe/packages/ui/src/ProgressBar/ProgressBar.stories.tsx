import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressBar } from "./ProgressBar";

const TONES = [
  "brand",
  "up",
  "down",
  "success",
  "warning",
  "neutral",
  "ai",
] as const;

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 1, step: 0.01 },
      description: "0~1 진행률. segments를 주면 무시된다",
    },
    tone: {
      control: "select",
      options: TONES,
      description: "막대 색",
    },
    height: {
      control: "number",
      description: "막대 높이(px)",
    },
    label: {
      control: "text",
      description: "스크린 리더가 읽을 이름. 필수",
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 0.62,
    label: "목표 진행률",
  },
};

export const AllTones: Story = {
  args: { label: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {TONES.map((tone) => (
        <ProgressBar key={tone} value={0.6} tone={tone} label={tone} />
      ))}
    </div>
  ),
};

/** 자산군 비중 — 여러 색으로 나뉜 막대. */
export const Segments: Story = {
  args: {
    label: "자산군 비중",
    segments: [
      { value: 0.45, tone: "brand", label: "국내주식" },
      { value: 0.3, tone: "down", label: "해외주식" },
      { value: 0.15, tone: "success", label: "채권" },
      { value: 0.1, tone: "neutral", label: "현금" },
    ],
  },
};

export const Heights: Story = {
  args: { label: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <ProgressBar value={0.5} height={4} label="4px" />
      <ProgressBar value={0.5} height={8} label="8px" />
      <ProgressBar value={0.5} height={16} label="16px" />
    </div>
  ),
};

/** 범위를 벗어난 값은 0~1로 잘린다. */
export const Boundaries: Story = {
  args: { label: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <ProgressBar value={0} label="0" />
      <ProgressBar value={1} label="100" />
      <ProgressBar value={-0.5} label="음수 입력" />
      <ProgressBar value={2} label="1 초과 입력" />
    </div>
  ),
};
