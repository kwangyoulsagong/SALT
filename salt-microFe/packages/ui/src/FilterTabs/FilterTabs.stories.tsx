// stories/FilterTabs.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterTabs } from "./FilterTabs";
import React, { useState } from "react";

const meta: Meta<typeof FilterTabs> = {
  title: "Components/Filter/FilterTabs",
  component: FilterTabs,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof meta>;

type FilterTabsOptions = React.ComponentProps<typeof FilterTabs>["options"];

const exampleOptions: FilterTabsOptions = [
  { label: "전체", value: "all" },
  { label: "거래대금", value: "trade" },
  { label: "변동률", value: "change" },
  { label: "가격", value: "price" },
  { label: "이름", value: "name" },
];

/** FilterTabs는 controlled 컴포넌트이므로 story에서 선택 상태를 보관한다. */
const StatefulFilterTabs = ({
  options = exampleOptions,
  defaultValue,
}: {
  options?: FilterTabsOptions;
  defaultValue: string;
}) => {
  const [value, setValue] = useState(defaultValue);
  return <FilterTabs options={options} value={value} onChange={setValue} />;
};

export const Default: Story = {
  args: { options: exampleOptions },
  render: (args) => (
    <StatefulFilterTabs options={args.options} defaultValue="all" />
  ),
};

// Active State Preview
export const ActiveSecondTab: Story = {
  render: () => (
    <StatefulFilterTabs options={exampleOptions} defaultValue="trade" />
  ),
};

const manyOptions: FilterTabsOptions = Array.from({ length: 15 }).map(
  (_, i) => ({
    label: `옵션 ${i + 1}`,
    value: `item${i + 1}`,
  })
);

export const ManyTabsOverflow: Story = {
  render: () => (
    <StatefulFilterTabs options={manyOptions} defaultValue="item3" />
  ),
};
