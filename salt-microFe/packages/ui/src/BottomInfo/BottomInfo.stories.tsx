import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomInfo } from "./BottomInfo";

const meta = {
  title: "Components/BottomInfo",
  component: BottomInfo,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text", description: "묶음 제목" },
  },
} satisfies Meta<typeof BottomInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      "표시된 수치는 실시간 시세와 다를 수 있습니다.",
      "투자 판단과 손실 책임은 본인에게 있습니다.",
      "과거 성과가 미래 수익을 보장하지 않습니다.",
    ],
  },
};

export const SingleItem: Story = {
  args: { items: ["최근 30일 기록만 표시됩니다."] },
};

export const CustomTitle: Story = {
  args: {
    title: "유의사항",
    items: [
      "세금 계산은 참고용이며 실제 신고 금액과 다를 수 있습니다.",
      "확정 금액은 신고 기간에 국세청 자료로 확인하세요.",
    ],
  },
};

export const Narrow: Story = {
  args: {
    items: [
      "폭 320px에서도 가로 스크롤이 생기지 않고 줄바꿈만 일어나야 한다.",
    ],
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <BottomInfo {...args} />
    </div>
  ),
};
