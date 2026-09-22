import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { SegmentedControl, type SegmentedOption } from "./SegmentedControl";

const modeOptions: SegmentedOption<string>[] = [
  { label: "단타", value: "scalp" },
  { label: "장기", value: "long_term" },
];

const periodOptions: SegmentedOption<string>[] = [
  { label: "1일", value: "d1" },
  { label: "1주", value: "w1" },
  { label: "1개월", value: "m1" },
  { label: "1년", value: "y1" },
];

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    label: { description: "스크린리더가 읽는 묶음 이름. 화면에 보이지 않는다" },
    value: { description: "선택된 값. controlled 전용이다" },
  },
  args: {
    options: modeOptions,
    value: "scalp",
    label: "판단 관점",
    onChange: () => {},
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** controlled 컴포넌트라 story 가 선택 값을 보관한다. Tab 으로 들어와 ←→ 로 옮긴다 */
const Stateful = ({
  options,
  initial,
  label,
}: {
  options: SegmentedOption<string>[];
  initial: string;
  label: string;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={setValue}
      label={label}
    />
  );
};

export const Default: Story = {
  render: (args) => (
    <Stateful options={args.options} initial={args.value} label={args.label} />
  ),
};

export const SecondSelected: Story = {
  args: { value: "long_term" },
  render: (args) => (
    <Stateful options={args.options} initial={args.value} label={args.label} />
  ),
};

export const FourOptions: Story = {
  args: { options: periodOptions, value: "w1", label: "기간" },
  render: (args) => (
    <Stateful options={args.options} initial={args.value} label={args.label} />
  ),
};
