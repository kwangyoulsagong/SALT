import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusGraphic } from "./StatusGraphic";
import { EmptyState } from "../EmptyState/EmptyState";
import { Button } from "../Button/Button";

const meta = {
  title: "Components/StatusGraphic",
  component: StatusGraphic,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: "inline-radio",
      options: ["success", "progress", "empty", "error", "blocked"],
      description: "상태 — 완료 · 진행 · 빈 상태 · 오류 · 막힘",
    },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
      description: "40 · 72 · 120px",
    },
  },
} satisfies Meta<typeof StatusGraphic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { kind: "success", size: "lg" },
};

export const AllKinds: Story = {
  args: { kind: "success" },
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <StatusGraphic kind="success" />
      <StatusGraphic kind="progress" />
      <StatusGraphic kind="empty" />
      <StatusGraphic kind="error" />
      <StatusGraphic kind="blocked" />
    </div>
  ),
};

export const AllSizes: Story = {
  args: { kind: "success" },
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <StatusGraphic kind="success" size="sm" />
      <StatusGraphic kind="success" size="md" />
      <StatusGraphic kind="success" size="lg" />
    </div>
  ),
};

/** 결과 화면은 새 컴포넌트가 아니라 `EmptyState` 의 `icon` 에 꽂는다 */
export const InEmptyState: Story = {
  args: { kind: "success" },
  render: () => (
    <EmptyState
      tone="success"
      iconFrame="none"
      title="거래 기록이 등록됐어요"
      description="평단과 보유 수량을 다시 계산했습니다."
      icon={<StatusGraphic kind="success" size="lg" />}
      action={<Button size="sm">확인</Button>}
    />
  ),
};
