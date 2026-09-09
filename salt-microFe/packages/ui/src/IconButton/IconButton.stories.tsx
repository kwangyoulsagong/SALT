import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, MoreVertical, Search, Star } from "lucide-react";
import { IconButton } from "./IconButton";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["ghost", "tonal", "solid"],
      description: "배경 처리",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "버튼 크기",
    },
    round: {
      control: "boolean",
      description: "원형 여부",
    },
    label: {
      control: "text",
      description: "버튼이 하는 일. 아이콘만 있으므로 필수",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <Search size={20} aria-hidden="true" />,
    label: "검색",
  },
};

export const AllVariants: Story = {
  args: { icon: null, label: "" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconButton
        icon={<Bell size={20} aria-hidden="true" />}
        label="알림 ghost"
        variant="ghost"
      />
      <IconButton
        icon={<Bell size={20} aria-hidden="true" />}
        label="알림 tonal"
        variant="tonal"
      />
      <IconButton
        icon={<Bell size={20} aria-hidden="true" />}
        label="알림 solid"
        variant="solid"
      />
    </div>
  ),
};

export const AllSizes: Story = {
  args: { icon: null, label: "" },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconButton
        icon={<Star size={16} aria-hidden="true" />}
        label="관심 종목 작게"
        variant="tonal"
        size="sm"
      />
      <IconButton
        icon={<Star size={20} aria-hidden="true" />}
        label="관심 종목 기본"
        variant="tonal"
        size="md"
      />
      <IconButton
        icon={<Star size={24} aria-hidden="true" />}
        label="관심 종목 크게"
        variant="tonal"
        size="lg"
      />
    </div>
  ),
};

export const Round: Story = {
  args: {
    icon: <MoreVertical size={20} aria-hidden="true" />,
    label: "더보기",
    variant: "tonal",
    round: true,
  },
};

export const Disabled: Story = {
  args: {
    icon: <Search size={20} aria-hidden="true" />,
    label: "검색",
    variant: "solid",
    disabled: true,
  },
};
