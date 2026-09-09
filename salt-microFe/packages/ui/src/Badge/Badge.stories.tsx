import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./Badge";

const TONES = [
  "neutral",
  "brand",
  "up",
  "down",
  "success",
  "warning",
  "ai",
] as const;

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: TONES,
      description: "의미별 색. 전부 틴트 배경 + 어두운 전경이다",
    },
    size: {
      control: "select",
      options: ["sm", "md"],
      description: "배지 크기",
    },
    children: {
      control: "text",
      description: "배지 문구",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "보통주",
  },
};

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {TONES.map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Badge size="sm" tone="brand">
        작게
      </Badge>
      <Badge size="md" tone="brand">
        기본
      </Badge>
    </div>
  ),
};

/** 색만으로 등락을 구분하지 않도록 문구에 방향을 담는다. */
export const MarketTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Badge tone="up">상승 3.4%</Badge>
      <Badge tone="down">하락 1.8%</Badge>
    </div>
  ),
};

export const LongLabel: Story = {
  args: {
    tone: "warning",
    children: "매우 긴 배지 문구가 들어가는 경우",
  },
};
