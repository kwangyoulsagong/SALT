import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stepper } from "./Stepper";

const meta = {
  title: "Components/Stepper",
  component: Stepper,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    min: { control: "number", description: "최솟값" },
    max: { control: "number", description: "최댓값" },
    step: { control: "number", description: "한 번에 움직일 크기" },
    unit: { control: "text", description: "값 오른쪽 단위" },
    size: { control: "inline-radio", options: ["sm", "md"], description: "크기" },
    hideLabel: { control: "boolean", description: "라벨을 숨긴다" },
    disabled: { control: "boolean", description: "비활성화 상태" },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "수량", value: 12, unit: "주", onChange: () => {} },
};

export const WithHelperText: Story = {
  args: {
    label: "수량",
    value: 12,
    unit: "주",
    max: 30,
    helperText: "최대 30주까지 주문할 수 있습니다",
    onChange: () => {},
  },
};

/** 경계에 닿으면 해당 버튼이 비활성화된다. */
export const AtBoundaries: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 280 }}>
      <Stepper label="최솟값" value={0} min={0} max={10} onChange={() => {}} />
      <Stepper label="최댓값" value={10} min={0} max={10} onChange={() => {}} />
    </div>
  ),
};

export const AllSizes: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 280 }}>
      <Stepper label="작게" size="sm" value={3} unit="주" onChange={() => {}} />
      <Stepper label="기본" size="md" value={3} unit="주" onChange={() => {}} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { label: "수량", value: 5, unit: "주", disabled: true, onChange: () => {} },
};

/** 버튼과 직접 입력이 같은 값을 바꾼다. */
export const Interactive: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: function InteractiveStory() {
    const [quantity, setQuantity] = useState(1);
    return (
      <div style={{ maxWidth: 280 }}>
        <Stepper
          label="수량"
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={999}
          unit="주"
          helperText={`예상 금액 ${(quantity * 74200).toLocaleString("ko-KR")}원`}
        />
      </div>
    );
  },
};

export const HiddenLabel: Story = {
  args: {
    label: "수량",
    value: 2,
    hideLabel: true,
    size: "sm",
    onChange: () => {},
  },
};
