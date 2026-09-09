import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Button } from "../Button/Button";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["empty", "success", "error"],
      description: "빈 상태인지 결과 화면인지",
    },
    title: {
      control: "text",
      description: "한 줄 요약",
    },
    description: {
      control: "text",
      description: "보조 설명",
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "아직 등록한 종목이 없어요",
    description: "관심 종목을 추가하면 여기에서 한 번에 볼 수 있습니다.",
    icon: <Inbox size={24} aria-hidden="true" />,
  },
};

export const WithAction: Story = {
  args: {
    title: "아직 등록한 종목이 없어요",
    description: "관심 종목을 추가하면 여기에서 한 번에 볼 수 있습니다.",
    icon: <Inbox size={24} aria-hidden="true" />,
    action: (
      <Button size="sm" variant="primary">
        종목 추가하기
      </Button>
    ),
  },
};

export const Success: Story = {
  args: {
    tone: "success",
    title: "저장했습니다",
    description: "거래 기록이 목록에 추가되었습니다.",
    icon: <CheckCircle2 size={24} aria-hidden="true" />,
  },
};

export const Error: Story = {
  args: {
    tone: "error",
    title: "불러오지 못했습니다",
    description: "네트워크 상태를 확인한 뒤 다시 시도하세요.",
    icon: <XCircle size={24} aria-hidden="true" />,
    action: (
      <Button size="sm" variant="ghost">
        다시 시도
      </Button>
    ),
  },
};

export const TitleOnly: Story = {
  args: {
    title: "표시할 내용이 없습니다",
  },
};

export const Narrow: Story = {
  args: { title: "" },
  render: () => (
    <div style={{ width: 320 }}>
      <EmptyState
        title="검색 결과가 없습니다"
        description="다른 종목명이나 종목 코드로 다시 검색해 보세요. 띄어쓰기를 지우면 결과가 나올 수도 있습니다."
        icon={<Inbox size={24} aria-hidden="true" />}
      />
    </div>
  ),
};
