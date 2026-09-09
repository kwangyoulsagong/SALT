import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextArea } from "./TextArea";

const meta = {
  title: "Components/TextArea",
  component: TextArea,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["box", "line"],
      description: "테두리 형태",
    },
    rows: { control: "number", description: "기본 줄 수" },
    maxLength: { control: "number", description: "글자 수 표시 기준" },
    autoResize: {
      control: "boolean",
      description: "내용에 따라 높이가 늘어난다. 채팅 입력창용",
    },
    error: { control: "text", description: "에러 문구" },
    helperText: { control: "text", description: "보조 설명" },
    disabled: { control: "boolean", description: "비활성화 상태" },
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "메모",
    value: "",
    placeholder: "이 거래를 왜 했는지 적어두면 나중에 도움이 됩니다",
    onChange: () => {},
  },
};

export const AllVariants: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
      <TextArea label="box" variant="box" value="박스형" onChange={() => {}} />
      <TextArea label="line" variant="line" value="밑줄형" onChange={() => {}} />
    </div>
  ),
};

/** 세면서 초과하면 붉어지지만 입력은 막지 않는다. */
export const WithCounter: Story = {
  args: { value: "", onChange: () => {} },
  render: function CounterStory() {
    const [value, setValue] = useState("최근 30일 매도 판단 근거");
    return (
      <div style={{ maxWidth: 420 }}>
        <TextArea
          label="메모"
          value={value}
          onChange={setValue}
          maxLength={40}
          helperText="40자를 넘으면 표시가 붉어집니다"
        />
      </div>
    );
  },
};

export const WithError: Story = {
  args: {
    label: "피드백 사유",
    value: "",
    error: "사유를 입력해 주세요",
    onChange: () => {},
  },
};

/** 코치 대화 입력창 — 줄이 늘면 높이가 따라 커지고 최대 높이에서 스크롤된다. */
export const AutoResize: Story = {
  args: { value: "", onChange: () => {} },
  render: function AutoResizeStory() {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 420 }}>
        <TextArea
          value={value}
          onChange={setValue}
          autoResize
          maxHeight={140}
          placeholder="코치에게 물어보기"
          aria-label="코치에게 물어보기"
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    label: "메모",
    value: "수정할 수 없습니다",
    disabled: true,
    onChange: () => {},
  },
};

export const Narrow: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ width: 320 }}>
      <TextArea
        label="아주 긴 항목 이름이 들어오는 경우를 확인합니다"
        value={"긴 문장이 여러 줄로 들어가도 가로 스크롤이 생기지 않아야 한다. ".repeat(3)}
        maxLength={60}
        onChange={() => {}}
      />
    </div>
  ),
};
