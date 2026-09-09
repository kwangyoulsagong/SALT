import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextButton } from "./TextButton";

const meta = {
  title: "Components/TextButton",
  component: TextButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: ["brand", "neutral", "danger"],
      description: "글자 색",
    },
    size: { control: "inline-radio", options: ["sm", "md"], description: "크기" },
    chevron: { control: "boolean", description: "오른쪽 이동 표시" },
    disabled: { control: "boolean", description: "비활성화 상태" },
    children: { control: "text", description: "버튼 문구" },
  },
} satisfies Meta<typeof TextButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "더보기" } };

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <TextButton tone="brand">브랜드</TextButton>
      <TextButton tone="neutral">중립</TextButton>
      <TextButton tone="danger">삭제</TextButton>
    </div>
  ),
};

export const AllSizes: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <TextButton size="sm">작게</TextButton>
      <TextButton size="md">기본</TextButton>
    </div>
  ),
};

export const WithChevron: Story = {
  args: { children: "전체 보기", chevron: true },
};

export const Disabled: Story = {
  args: { children: "더보기", disabled: true },
};
