import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { StatusToast } from "./StatusToast";
import { Button } from "../Button/Button";

const meta = {
  title: "Components/StatusToast",
  component: StatusToast,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: "inline-radio",
      options: ["success", "progress", "empty", "error", "blocked"],
      description: "상태 그래픽",
    },
    duration: {
      control: "number",
      description: "떠 있는 시간(ms)",
    },
  },
} satisfies Meta<typeof StatusToast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 버튼을 누를 때마다 패널 위에 잠깐 떴다가 사라진다 */
export const Default: Story = {
  args: { trigger: null, children: "분석이 완료됐어요" },
  render: (args) => {
    const [count, setCount] = useState<number | null>(null);
    return (
      <div style={{ position: "relative", width: 360, height: 200, padding: 24, borderRadius: 16, background: "#fff", boxShadow: "inset 0 0 0 1px #eee" }}>
        <StatusToast {...args} trigger={count} />
        <div style={{ marginTop: 80 }}>
          <Button size="sm" onClick={() => setCount((value) => (value ?? 0) + 1)}>
            다시 띄우기
          </Button>
        </div>
      </div>
    );
  },
};
