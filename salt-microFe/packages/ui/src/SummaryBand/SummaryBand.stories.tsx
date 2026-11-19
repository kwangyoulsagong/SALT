import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SummaryBand } from "./SummaryBand";

const meta = {
  title: "Components/SummaryBand",
  component: SummaryBand,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    items: { description: "타일 목록 — hero 는 한 띠에 하나만" },
    label: { control: "text", description: "띠 이름(스크린리더)" },
  },
} satisfies Meta<typeof SummaryBand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "이번 달 요약",
    items: [
      { key: "spent", label: "이번 달 쓴 돈", value: "265,250원", hint: "17건", hero: true },
      { key: "remaining", label: "남은 돈", value: "722,350원" },
      { key: "daily", label: "하루에 쓸 수 있는 돈", value: "60,195원", hint: "오늘 포함 12일" },
      { key: "landing", label: "이번 달 끝에는", value: "1,020,000 ~ 1,180,000원" },
    ],
  },
};

/** 긴 값 — 좁은 칸에서 줄을 바꾼다(잘리지 않는다) */
export const LongValues: Story = {
  args: {
    label: "긴 값",
    items: [
      { key: "a", label: "모은 돈", value: "12,345,678,900원", hero: true },
      { key: "b", label: "가장 가까운 도달", value: "2027년 3월 ~ 2027년 9월 사이" },
    ],
  },
};
