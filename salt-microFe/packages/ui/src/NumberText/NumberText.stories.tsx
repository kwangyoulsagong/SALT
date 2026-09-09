import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NumberText } from "./NumberText";

const meta = {
  title: "Components/NumberText",
  component: NumberText,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "숫자. 문자열이면 이미 포맷된 값으로 보고 그대로 출력한다",
    },
    unit: {
      control: "text",
      description: "값 뒤에 붙는 단위. 예: 원, %, 주",
    },
    signed: {
      control: "boolean",
      description: "부호를 항상 문자로 출력한다. 색만으로 등락을 전달하지 않는다",
    },
    tone: {
      control: "select",
      options: ["auto", "up", "down", "neutral", "muted"],
      description: "색. auto는 값의 부호로 결정한다",
    },
    size: {
      control: "select",
      options: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"],
      description: "타입 스케일",
    },
    weight: {
      control: "select",
      options: ["regular", "medium", "semibold", "bold"],
      description: "굵기",
    },
  },
} satisfies Meta<typeof NumberText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 1284500,
    unit: "원",
  },
};

export const Positive: Story = {
  args: {
    value: 3.42,
    unit: "%",
    signed: true,
  },
};

export const Negative: Story = {
  args: {
    value: -1.87,
    unit: "%",
    signed: true,
  },
};

export const Zero: Story = {
  args: {
    value: 0,
    unit: "%",
    signed: true,
  },
};

/** 색을 못 보는 사용자도 부호 문자로 등락을 읽을 수 있어야 한다. */
export const SignedComparison: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <NumberText value={12500} unit="원" signed />
      <NumberText value={-12500} unit="원" signed />
      <NumberText value={0} unit="원" signed />
      <NumberText value={12500} unit="원" />
      <NumberText value={-12500} unit="원" />
    </div>
  ),
};

export const AllSizes: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      {(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"] as const).map(
        (size) => (
          <NumberText key={size} value={1284500} unit="원" size={size} />
        )
      )}
    </div>
  ),
};

export const AllTones: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <NumberText value={1284500} tone="up" />
      <NumberText value={1284500} tone="down" />
      <NumberText value={1284500} tone="neutral" />
      <NumberText value={1284500} tone="muted" />
    </div>
  ),
};

/** 자릿수가 바뀌어도 세로 정렬이 흔들리지 않는다. */
export const TabularAlignment: Story = {
  args: { value: 0 },
  render: () => (
    <div style={{ display: "grid", gap: 4, justifyItems: "end", width: 160 }}>
      <NumberText value={1111111} unit="원" />
      <NumberText value={8888888} unit="원" />
      <NumberText value={90} unit="원" />
    </div>
  ),
};

/** 이미 포맷한 문자열을 그대로 넘기는 경우. */
export const PreformattedString: Story = {
  args: {
    value: "-1,284,500.25",
    unit: "원",
    signed: true,
  },
};
