// stories/FilterTabs.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { FilterTabs } from "./FilterTabs";
import React, { useState } from "react";

const meta: Meta<typeof FilterTabs> = {
  title: "Components/Filter/FilterTabs",
  component: FilterTabs,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;

const exampleOptions = [
  { label: "전체", value: "all" },
  { label: "거래대금", value: "trade" },
  { label: "변동률", value: "change" },
  { label: "가격", value: "price" },
  { label: "이름", value: "name" },
];

export const Default: Story = {
  args: { options: exampleOptions },
  render: (args) => {
    const [value, setValue] = useState("all");
    return <FilterTabs {...args} value={value} onChange={setValue} />;
  },
};

// Active State Preview
export const ActiveSecondTab: Story = {
  render: () => {
    const [value, setValue] = useState("trade");
    return (
      <FilterTabs options={exampleOptions} value={value} onChange={setValue} />
    );
  },
};

export const ManyTabsOverflow: Story = {
  render: () => {
    const [value, setValue] = useState("item3");
    const manyOptions = Array.from({ length: 15 }).map((_, i) => ({
      label: `옵션 ${i + 1}`,
      value: `item${i + 1}`,
    }));
    return (
      <FilterTabs options={manyOptions} value={value} onChange={setValue} />
    );
  },
};
