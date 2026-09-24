import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DisclosureSlot } from "./DisclosureSlot.tsx";

const meta = {
  title: "Components/DisclosureSlot",
  component: DisclosureSlot,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    lines: { description: "고지 세 줄(튜플). 끄는 prop 이 없다" },
    label: { description: "스크린 리더가 읽을 묶음 이름" },
  },
  args: {
    label: "고지",
    lines: ["정보 제공 목적이에요", "개별 상담이 아니에요", "원금 손실이 날 수 있어요"],
  },
} satisfies Meta<typeof DisclosureSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 좁은 카드 — 줄이 접혀도 구분점이 줄 끝에 남는다 */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ width: 220 }}>
      <DisclosureSlot {...args} />
    </div>
  ),
};

/** 빈 줄이 섞여도 나머지 줄은 보인다 — 조용히 사라지지 않는다 */
export const WithEmptyLine: Story = {
  args: {
    lines: ["정보 제공 목적이에요", "", "원금 손실이 날 수 있어요"],
  },
};
