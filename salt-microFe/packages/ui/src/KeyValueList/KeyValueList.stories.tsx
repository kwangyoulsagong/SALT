import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KeyValueList } from "./KeyValueList";

const meta = {
  title: "Components/KeyValueList",
  component: KeyValueList,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    columns: {
      control: "inline-radio",
      options: [1, 2],
      description: "열 수. 2열은 폭 360px 미만에서 1열로 접힌다",
    },
  },
} satisfies Meta<typeof KeyValueList>;

export default meta;
type Story = StoryObj<typeof meta>;

const quote = [
  { label: "시가", value: "73,100" },
  { label: "고가", value: "74,900", tone: "up" as const },
  { label: "저가", value: "72,800", tone: "down" as const },
  { label: "거래량", value: "12,845,300" },
  { label: "52주 최고", value: "88,800" },
  { label: "52주 최저", value: "49,900" },
];

export const Default: Story = {
  args: {
    items: quote.slice(0, 4),
  },
};

export const TwoColumns: Story = {
  args: {
    items: quote,
    columns: 2,
  },
};

/** 홀수 개일 때 마지막 줄 구분선 처리를 확인한다. */
export const OddCountTwoColumns: Story = {
  args: {
    items: quote.slice(0, 5),
    columns: 2,
  },
};

export const AllTones: Story = {
  args: {
    items: [
      { label: "기본", value: "74,200" },
      { label: "상승", value: "+2.13%", tone: "up" },
      { label: "하락", value: "−1.87%", tone: "down" },
      { label: "흐림", value: "—", tone: "muted" },
    ],
  },
};

export const LongLabel: Story = {
  args: {
    items: [
      {
        label: "아주 긴 항목 이름이 들어오는 경우",
        value: "1,284,500,000",
      },
      { label: "짧은 항목", value: "12" },
    ],
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};
