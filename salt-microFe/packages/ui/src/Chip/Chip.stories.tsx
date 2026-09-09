import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chip } from "./Chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    selected: {
      control: "boolean",
      description: "선택 상태. aria-pressed로도 전달된다",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    size: {
      control: "select",
      options: ["sm", "md"],
      description: "칩 크기",
    },
    children: {
      control: "text",
      description: "칩 문구",
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "10만원",
  },
};

export const Selected: Story = {
  args: {
    children: "10만원",
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "10만원",
    disabled: true,
  },
};

export const AllSizes: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Chip size="sm">작게</Chip>
      <Chip size="sm" selected>
        작게 선택
      </Chip>
      <Chip size="md">기본</Chip>
      <Chip size="md" selected>
        기본 선택
      </Chip>
    </div>
  ),
};

/** 복수 선택. 하나만 고르는 탭이 필요하면 `FilterTabs`를 쓴다. */
export const MultiSelect: Story = {
  args: { children: "" },
  render: function MultiSelectStory() {
    const [picked, setPicked] = useState<string[]>(["5%"]);
    const options = ["3%", "5%", "10%", "15%"];

    const toggle = (value: string) =>
      setPicked((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((option) => (
          <Chip
            key={option}
            selected={picked.includes(option)}
            onPress={() => toggle(option)}
          >
            {option}
          </Chip>
        ))}
      </div>
    );
  },
};

export const Overflow: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", width: 280 }}>
      {["전체", "국내주식", "해외주식", "ETF", "채권", "현금"].map((label) => (
        <Chip key={label} size="sm">
          {label}
        </Chip>
      ))}
    </div>
  ),
};
