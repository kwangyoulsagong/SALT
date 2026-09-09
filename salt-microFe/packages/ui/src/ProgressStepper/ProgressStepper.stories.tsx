import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressStepper } from "./ProgressStepper";

const steps = [
  { id: "connect", label: "거래내역 연결" },
  { id: "review", label: "판정 확인" },
  { id: "plan", label: "계획 만들기" },
  { id: "done", label: "완료" },
];

const meta = {
  title: "Components/ProgressStepper",
  component: ProgressStepper,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    current: {
      control: "number",
      description: "진행 중인 단계 인덱스. steps.length면 전부 완료",
    },
    label: { control: "text", description: "단계 묶음 이름" },
  },
} satisfies Meta<typeof ProgressStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { steps, current: 1 } };

export const FirstStep: Story = { args: { steps, current: 0 } };

export const AllDone: Story = { args: { steps, current: steps.length } };

export const TwoSteps: Story = {
  args: {
    steps: [
      { id: "input", label: "정보 입력" },
      { id: "confirm", label: "확인" },
    ],
    current: 1,
  },
};

/** 라벨이 길면 줄바꿈되고 칸 폭은 그대로 나뉜다. */
export const LongLabels: Story = {
  args: {
    steps: [
      { id: "a", label: "거래내역 연결하기" },
      { id: "b", label: "판정 결과 확인하기" },
      { id: "c", label: "익절 계획 만들기" },
    ],
    current: 1,
  },
};

export const Narrow: Story = {
  args: { steps, current: 2 },
  render: (args) => (
    <div style={{ width: 320 }}>
      <ProgressStepper {...args} />
    </div>
  ),
};
