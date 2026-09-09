import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Agreement } from "./Agreement";
import { TextButton } from "../TextButton/TextButton";

const items = [
  { id: "service", label: "서비스 이용약관", required: true, detail: <TextButton size="sm" tone="neutral" chevron>보기</TextButton> },
  { id: "privacy", label: "개인정보 수집·이용 동의", required: true, detail: <TextButton size="sm" tone="neutral" chevron>보기</TextButton> },
  { id: "marketing", label: "마케팅 정보 수신 동의" },
];

const meta = {
  title: "Components/Agreement",
  component: Agreement,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    allLabel: { control: "text", description: "전체 동의 줄 문구" },
  },
} satisfies Meta<typeof Agreement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { items, value: [], onChange: () => {} },
};

export const AllChecked: Story = {
  args: { items, value: items.map((item) => item.id), onChange: () => {} },
};

/** 일부만 고르면 전체 선택이 indeterminate가 된다. */
export const Partial: Story = {
  args: { items, value: ["service"], onChange: () => {} },
};

export const Interactive: Story = {
  args: { items, value: [], onChange: () => {} },
  render: function InteractiveStory() {
    const [value, setValue] = useState<string[]>([]);
    const requiredIds = items.filter((item) => item.required).map((item) => item.id);
    const canProceed = requiredIds.every((id) => value.includes(id));

    return (
      <div style={{ maxWidth: 420, display: "grid", gap: 16 }}>
        <Agreement items={items} value={value} onChange={setValue} />
        <span style={{ fontSize: 13, color: canProceed ? "#2B8A3E" : "#8B95A1" }}>
          {canProceed ? "다음으로 넘어갈 수 있습니다" : "필수 항목에 동의해 주세요"}
        </span>
      </div>
    );
  },
};

export const Narrow: Story = {
  args: { items, value: ["service"], onChange: () => {} },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Agreement {...args} />
    </div>
  ),
};
