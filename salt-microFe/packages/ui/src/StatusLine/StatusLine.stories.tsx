import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusLine } from "./StatusLine";

const meta = {
  title: "Components/StatusLine",
  component: StatusLine,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: "inline-radio",
      options: ["success", "progress", "empty", "error", "blocked"],
      description: "상태 — 완료 · 진행 · 빈 상태 · 오류 · 막힘",
    },
    live: {
      control: "boolean",
      description: "바뀔 때 스크린리더가 읽는다",
    },
  },
} satisfies Meta<typeof StatusLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { kind: "success", children: "거래 기록이 등록됐어요", live: true },
};

export const AllKinds: Story = {
  args: { kind: "success", children: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <StatusLine kind="success">분석이 완료됐어요</StatusLine>
      <StatusLine kind="progress">분석하는 중이에요</StatusLine>
      <StatusLine kind="empty">아직 기록이 없어요</StatusLine>
      <StatusLine kind="error">지금은 불러올 수 없어요. 잠시 후 다시 확인해 주세요.</StatusLine>
      <StatusLine kind="blocked">표본이 모자라 판정을 보여 주지 않아요</StatusLine>
    </div>
  ),
};

export const LongText: Story = {
  args: {
    kind: "error",
    children: "지금은 판단을 불러올 수 없어요. 시세 연결이 돌아오면 자동으로 다시 불러옵니다. 문장이 길어도 그래픽은 첫 줄 옆에 남습니다.",
  },
};
