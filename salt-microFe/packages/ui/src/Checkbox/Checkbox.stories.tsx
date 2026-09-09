import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean", description: "선택 여부" },
    indeterminate: {
      control: "boolean",
      description: "하위 항목이 일부만 선택된 상태",
    },
    disabled: { control: "boolean", description: "비활성화 상태" },
    size: {
      control: "inline-radio",
      options: ["sm", "md"],
      description: "박스 크기",
    },
    round: { control: "boolean", description: "원형 여부" },
    label: { control: "text", description: "옆에 보이는 이름" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    label: "약관에 동의합니다",
    onChange: () => {},
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    label: "약관에 동의합니다",
    onChange: () => {},
  },
};

export const Indeterminate: Story = {
  args: {
    checked: false,
    indeterminate: true,
    label: "전체 선택",
    onChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    checked: true,
    disabled: true,
    label: "필수 항목",
    onChange: () => {},
  },
};

export const AllSizes: Story = {
  args: { checked: true, onChange: () => {} },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Checkbox checked size="sm" label="작게" onChange={() => {}} />
      <Checkbox checked size="md" label="기본" onChange={() => {}} />
      <Checkbox checked round label="원형" onChange={() => {}} />
    </div>
  ),
};

/** 전체 선택이 하위 상태에 따라 indeterminate로 바뀐다. Space로 조작된다. */
export const CheckList: Story = {
  args: { checked: false, onChange: () => {} },
  render: function CheckListStory() {
    const items = ["체결 알림", "목표가 알림", "공시 알림"];
    const [picked, setPicked] = useState<string[]>(["체결 알림"]);

    const allChecked = picked.length === items.length;
    const someChecked = picked.length > 0 && !allChecked;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          label="전체 선택"
          onChange={(next) => setPicked(next ? [...items] : [])}
        />
        <div style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
          {items.map((item) => (
            <Checkbox
              key={item}
              checked={picked.includes(item)}
              label={item}
              onChange={(next) =>
                setPicked((prev) =>
                  next ? [...prev, item] : prev.filter((v) => v !== item)
                )
              }
            />
          ))}
        </div>
      </div>
    );
  },
};

/** 라벨을 안 보여줄 때는 ariaLabel이 필요하다. */
export const WithoutVisibleLabel: Story = {
  args: {
    checked: false,
    ariaLabel: "이 행 선택",
    onChange: () => {},
  },
};
