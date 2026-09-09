import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./Skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    width: {
      control: "text",
      description: "너비. 숫자는 px, 문자열은 CSS 값",
    },
    height: {
      control: "text",
      description: "높이",
    },
    radius: {
      control: "select",
      options: ["none", "small", "base", "medium", "full"],
      description: "모서리",
    },
    lines: {
      control: "number",
      description: "2 이상이면 줄을 쌓는다. 마지막 줄은 60% 폭",
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Lines: Story = {
  args: {
    lines: 3,
  },
};

export const AllRadius: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Skeleton width={48} height={48} radius="none" />
      <Skeleton width={48} height={48} radius="small" />
      <Skeleton width={48} height={48} radius="base" />
      <Skeleton width={48} height={48} radius="medium" />
      <Skeleton width={48} height={48} radius="full" />
    </div>
  ),
};

/** 로딩 중 리스트 행. 실제 행과 높이가 같아야 깜빡임이 적다. */
export const ListRowLoading: Story = {
  render: () => (
    <div style={{ background: "#FFFFFF", width: 360 }}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: 56,
            padding: "12px 20px",
          }}
        >
          <Skeleton width={40} height={40} radius="full" />
          <div style={{ flex: 1, display: "grid", gap: 6 }}>
            <Skeleton width="50%" height={15} />
            <Skeleton width="30%" height={13} />
          </div>
          <Skeleton width={72} height={15} />
        </div>
      ))}
    </div>
  ),
};

/** `prefers-reduced-motion: reduce`에서는 깜빡임이 멈춘다. */
export const ReducedMotion: Story = {
  args: {
    width: 240,
    height: 24,
  },
};
