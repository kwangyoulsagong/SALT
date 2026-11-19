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

/** 칩 — 차트 기간처럼 카드 머리에 가볍게 얹는 선택 */
export const Chip: Story = {
  args: { options: exampleOptions },
  render: () => {
    const Chips = () => {
      const [value, setValue] = useState("1d");
      return (
        <FilterTabs
          variant="chip"
          options={[
            { label: "1분", value: "1m" },
            { label: "5분", value: "5m" },
            { label: "1시간", value: "1h" },
            { label: "일", value: "1d" },
          ]}
          value={value}
          onChange={setValue}
          label="기간"
        />
      );
    };
    return <Chips />;
  },
};

/** 필터 칩 — 목록을 거르는 칩. 고른 것은 파랑 글자 + 옅은 파랑 면(색만이 아니라 `aria-pressed` 로도 알린다) */
export const Filter: Story = {
  args: { options: exampleOptions },
  render: () => {
    const Filters = () => {
      const [value, setValue] = useState("all");
      return (
        <FilterTabs
          variant="filter"
          options={[
            { label: "전체", value: "all" },
            { label: "코인", value: "crypto" },
            { label: "국내 주식", value: "kr" },
            { label: "관심 종목", value: "watch" },
          ]}
          value={value}
          onChange={setValue}
          label="종류"
        />
      );
    };
    return <Filters />;
  },
};
