import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { TickFlash } from "./TickFlash";

const meta = {
  title: "Components/TickFlash",
  component: TickFlash,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "number",
      description: "비교할 숫자 — 바뀌면 방향 색이 한 번 옅어진다",
    },
  },
} satisfies Meta<typeof TickFlash>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 95_000_000, children: "95,000,000 원" },
};

const PRICES = [95_000_000, 95_120_000, 94_980_000, 95_050_000];

/** 1.5초마다 값이 바뀌는 시세 — 오르면 붉은 면, 내리면 푸른 면 */
export const LiveTicks: Story = {
  args: { value: PRICES[0]!, children: null },
  render: () => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
      const timer = window.setInterval(() => setIndex((current) => (current + 1) % PRICES.length), 1500);
      return () => window.clearInterval(timer);
    }, []);
    const price = PRICES[index]!;
    return <TickFlash value={price}>{price.toLocaleString("ko-KR")} 원</TickFlash>;
  },
};
