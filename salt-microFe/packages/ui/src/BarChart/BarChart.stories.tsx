import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BarChart } from "./BarChart";

const meta = {
  title: "Components/BarChart",
  component: BarChart,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    height: { control: "number", description: "막대 영역 높이(px)" },
    max: { control: "number", description: "최댓값 고정. 없으면 데이터 최댓값" },
    showValues: { control: "boolean", description: "막대 위에 값 표시" },
    label: { control: "text", description: "차트 이름. 표 캡션으로도 쓰인다" },
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const monthly = [
  { label: "4월", value: 1240000 },
  { label: "5월", value: 890000 },
  { label: "6월", value: 1730000 },
  { label: "7월", value: 1520000 },
  { label: "8월", value: 2010000 },
];

export const Default: Story = {
  args: { items: monthly, label: "월별 매수 금액" },
};

export const WithValues: Story = {
  args: {
    items: monthly.map((item) => ({ ...item, value: item.value / 10000 })),
    label: "월별 매수 금액(만원)",
    showValues: true,
    format: (value) => `${Math.round(value)}`,
  },
};

/** 항목마다 색을 달리 줄 수 있다. 손익처럼 방향이 있는 값에 쓴다. */
export const MixedTones: Story = {
  args: {
    label: "월별 실현 손익",
    items: [
      { label: "4월", value: 320000, tone: "up" },
      { label: "5월", value: 180000, tone: "up" },
      { label: "6월", value: 90000, tone: "down" },
      { label: "7월", value: 410000, tone: "up" },
      { label: "8월", value: 260000, tone: "down" },
    ],
  },
};

export const AssetMix: Story = {
  args: {
    label: "자산군 비중",
    showValues: true,
    format: (value) => `${value}%`,
    items: [
      { label: "국내주식", value: 45, tone: "brand" },
      { label: "해외주식", value: 30, tone: "down" },
      { label: "채권", value: 15, tone: "neutral" },
      { label: "현금", value: 10, tone: "neutral" },
    ],
  },
};

/** 값이 모두 0이면 막대가 최소 높이로만 남는다. */
export const AllZero: Story = {
  args: {
    label: "거래 없음",
    items: [
      { label: "4월", value: 0 },
      { label: "5월", value: 0 },
    ],
  },
};

export const Narrow: Story = {
  args: { items: monthly, label: "월별 매수 금액" },
  render: (args) => (
    <div style={{ width: 320 }}>
      <BarChart {...args} />
    </div>
  ),
};
