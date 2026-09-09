import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Slider } from "./Slider";

const meta = {
  title: "Components/Slider",
  component: Slider,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    min: { control: "number", description: "최솟값" },
    max: { control: "number", description: "최댓값" },
    step: { control: "number", description: "증감 단위" },
    disabled: { control: "boolean", description: "비활성화 상태" },
    showNumberInput: {
      control: "boolean",
      description: "직접 입력 필드 표시. 드래그 대체 수단이라 기본은 켜짐",
    },
    label: { control: "text", description: "슬라이더 이름" },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "연말 시가 가정",
    value: 50,
    onChange: () => {},
  },
};

/** 드래그, 화살표 키, 숫자 직접 입력 세 가지가 모두 같은 값을 바꾼다. */
export const Interactive: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: function InteractiveStory() {
    const [value, setValue] = useState(74200);

    return (
      <div style={{ maxWidth: 360 }}>
        <Slider
          label="연말 시가 가정"
          value={value}
          onChange={setValue}
          min={40000}
          max={120000}
          step={100}
          format={(next) => `${next.toLocaleString("ko-KR")}원`}
        />
      </div>
    );
  },
};

export const WithFormat: Story = {
  args: {
    label: "손절률",
    value: 8,
    min: 1,
    max: 30,
    step: 1,
    onChange: () => {},
    format: (value) => `${value}%`,
    showNumberInput: false,
  },
};

export const Disabled: Story = {
  args: {
    label: "조정할 수 없는 값",
    value: 30,
    disabled: true,
    onChange: () => {},
  },
};

export const Boundaries: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 360 }}>
      <Slider label="최솟값" value={0} min={0} max={100} onChange={() => {}} />
      <Slider label="최댓값" value={100} min={0} max={100} onChange={() => {}} />
    </div>
  ),
};

export const Narrow: Story = {
  args: { label: "", value: 0, onChange: () => {} },
  render: () => (
    <div style={{ width: 320 }}>
      <Slider
        label="아주 긴 슬라이더 이름이 들어오는 경우"
        value={50}
        onChange={() => {}}
      />
    </div>
  ),
};
