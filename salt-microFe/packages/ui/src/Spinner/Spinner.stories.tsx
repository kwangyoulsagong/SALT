import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner } from "./Spinner";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"], description: "크기" },
    tone: {
      control: "select",
      options: ["brand", "neutral", "white"],
      description: "색. white는 어두운 배경 위에 쓴다",
    },
    label: {
      control: "text",
      description: "스크린 리더가 읽을 문구. 화면 전체 로딩에는 필수",
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "불러오는 중" } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Spinner tone="brand" />
      <Spinner tone="neutral" />
      <span style={{ background: "#191F28", padding: 12, borderRadius: 8 }}>
        <Spinner tone="white" />
      </span>
    </div>
  ),
};

/** 목록·카드처럼 자리를 미리 잡아야 하면 Skeleton이 낫다. */
export const FullScreenLoading: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        gap: 12,
        width: 280,
        height: 160,
      }}
    >
      <Spinner size="lg" label="시세를 불러오는 중" />
      <span style={{ color: "#8B95A1", fontSize: 13 }}>시세를 불러오는 중</span>
    </div>
  ),
};
