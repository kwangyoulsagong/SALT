import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Rating } from "./Rating";

const meta = {
  title: "Components/Rating",
  component: Rating,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    value: { control: "number", description: "현재 점수" },
    max: { control: "number", description: "만점" },
    size: { control: "inline-radio", options: ["sm", "md"], description: "별 크기" },
    showValue: { control: "boolean", description: "숫자도 함께 표시" },
    label: { control: "text", description: "무엇에 대한 평가인지" },
  },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

/** onChange가 없으면 읽기 전용 표시다. */
export const ReadOnly: Story = { args: { value: 4 } };

export const WithValue: Story = { args: { value: 3.6, showValue: true } };

export const AllSizes: Story = {
  args: { value: 4 },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Rating value={4} size="sm" />
      <Rating value={4} size="md" />
    </div>
  ),
};

export const Empty: Story = { args: { value: 0 } };

/** onChange를 주면 radiogroup이 되고 Tab·Enter로 고를 수 있다. */
export const Interactive: Story = {
  args: { value: 0 },
  render: function InteractiveStory() {
    const [score, setScore] = useState(0);
    return (
      <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        <Rating
          value={score}
          onChange={setScore}
          label="코치 추천이 도움이 되었나요"
        />
        <span style={{ fontSize: 13, color: "#8B95A1" }}>
          {score === 0 ? "아직 평가 없음" : `${score}점`}
        </span>
      </div>
    );
  },
};
