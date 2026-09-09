import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Divider } from "./Divider";

const meta = {
  title: "Components/Divider",
  component: Divider,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
      description: "선 방향",
    },
    tone: {
      control: "select",
      options: ["light", "default", "strong"],
      description: "선 진하기",
    },
    inset: {
      control: "select",
      options: ["none", "row", "leading"],
      description: "들여쓰기. row는 리스트 행 패딩, leading은 아이콘 폭만큼",
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, background: "#FFFFFF" }}>
      <Divider tone="light" />
      <Divider tone="default" />
      <Divider tone="strong" />
    </div>
  ),
};

export const AllInsets: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, background: "#FFFFFF" }}>
      <Divider inset="none" />
      <Divider inset="row" />
      <Divider inset="leading" />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 24,
        background: "#FFFFFF",
      }}
    >
      <span>코스피</span>
      <Divider orientation="vertical" />
      <span>코스닥</span>
      <Divider orientation="vertical" />
      <span>환율</span>
    </div>
  ),
};
