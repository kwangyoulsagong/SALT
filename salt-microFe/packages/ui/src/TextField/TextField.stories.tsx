import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextField } from "./TextField";

const meta = {
  title: "Components/TextField",
  component: TextField,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["box", "line", "big", "hero"],
      description: "테두리와 글자 크기. big·hero는 금액 입력용",
    },
    label: { control: "text", description: "위에 보이는 이름" },
    error: { control: "text", description: "에러 문구. 있으면 테두리가 붉어진다" },
    helperText: { control: "text", description: "보조 설명" },
    disabled: { control: "boolean", description: "비활성화 상태" },
    placeholder: { control: "text", description: "빈 값일 때 안내 문구" },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "메모",
    value: "",
    placeholder: "내용을 입력하세요",
    onChange: () => {},
  },
};

export const AllVariants: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 32, maxWidth: 360 }}>
      <TextField label="box" variant="box" value="74,200" onChange={() => {}} />
      <TextField label="line" variant="line" value="74,200" onChange={() => {}} />
      <TextField
        label="big"
        variant="big"
        value="74,200"
        trailing={<span>원</span>}
        onChange={() => {}}
      />
      <TextField
        label="hero"
        variant="hero"
        value="890,400"
        trailing={<span style={{ fontSize: 20 }}>원</span>}
        onChange={() => {}}
      />
    </div>
  ),
};

/** 주문 금액 입력 — 화면 전체가 입력 하나일 때 쓴다. */
export const Hero: Story = {
  args: {
    label: "주문 단가",
    variant: "hero",
    value: "74,200",
    inputMode: "numeric",
    helperText: "현재가 74,200원",
    onChange: () => {},
  },
};

export const WithError: Story = {
  args: {
    label: "수량",
    value: "0",
    error: "1주 이상 입력하세요",
    onChange: () => {},
  },
};

export const WithHelperText: Story = {
  args: {
    label: "목표가",
    value: "",
    placeholder: "0",
    helperText: "현재가보다 높은 값을 넣으면 상승 알림이 됩니다.",
    onChange: () => {},
  },
};

export const WithAffix: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <TextField
        label="매수 단가"
        value="74200"
        inputMode="numeric"
        trailing={<span>원</span>}
        onChange={() => {}}
      />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: "종목 코드",
    value: "005930",
    disabled: true,
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: { value: "", onChange: () => {} },
  render: function InteractiveStory() {
    const [value, setValue] = useState("");
    const error = value.length > 20 ? "20자 이내로 입력하세요" : undefined;

    return (
      <div style={{ maxWidth: 360 }}>
        <TextField
          label="메모"
          value={value}
          onChange={setValue}
          error={error}
          helperText={`${value.length} / 20자`}
          placeholder="내용을 입력하세요"
        />
      </div>
    );
  },
};

export const Narrow: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ width: 320 }}>
      <TextField
        label="아주 긴 항목 이름이 들어오는 경우를 확인합니다"
        value="아주 긴 값이 들어와도 가로 스크롤이 생기지 않아야 한다"
        onChange={() => {}}
      />
    </div>
  ),
};
