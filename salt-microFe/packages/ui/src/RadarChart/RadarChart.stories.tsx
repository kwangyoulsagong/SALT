import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RadarChart } from "./RadarChart";

const meta = {
  title: "Components/RadarChart",
  component: RadarChart,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "number", description: "높이(px) — 폭은 좌우 축 이름 자리만큼 더 넓다" },
    max: { control: "number", description: "축 최댓값" },
    rings: { control: "number", description: "동심 격자 단계 수" },
    label: { control: "text", description: "스크린 리더 이름 — 값은 그림 밖 표가 말한다" },
  },
} satisfies Meta<typeof RadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "축 네 개 점수",
    axes: [
      { key: "a", label: "축 A", value: 72, limit: 60, breached: true },
      { key: "b", label: "축 B", value: 35, limit: 60 },
      { key: "c", label: "축 C", value: 48, limit: 60 },
      { key: "d", label: "축 D", value: 20, limit: 40 },
    ],
  },
};

/** 값이 없는 축이 있으면 다각형을 잇지 않고 점만 — 빈 축을 0 으로 접지 않는다 */
export const MissingAxis: Story = {
  args: {
    label: "한 축은 값 없음",
    axes: [
      { key: "a", label: "축 A", value: 72, limit: 60, breached: true },
      { key: "b", label: "축 B", value: 35, limit: 60 },
      { key: "c", label: "축 C", value: 48, limit: 60 },
      { key: "d", label: "축 D", value: null, limit: 40 },
    ],
  },
};

export const WithoutLimits: Story = {
  args: {
    label: "상한 없이",
    size: 200,
    axes: [
      { key: "a", label: "축 A", value: 80 },
      { key: "b", label: "축 B", value: 50 },
      { key: "c", label: "축 C", value: 65 },
    ],
  },
};
