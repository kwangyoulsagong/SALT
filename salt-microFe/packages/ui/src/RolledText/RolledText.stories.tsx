import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { RolledText } from "./RolledText";

const meta = {
  title: "Components/RolledText",
  component: RolledText,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    text: {
      control: "text",
      description: "이미 포맷된 금액 글자. 숫자로 시작하지 않으면 그대로 보인다",
    },
  },
} satisfies Meta<typeof RolledText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { text: "1,234,500원" },
};

/** 값이 바뀔 때만 굴러간다 — 처음 그릴 때는 글자 그대로 */
export const ChangesOnUpdate: Story = {
  args: { text: "199,500원" },
  render: () => {
    const AMOUNTS = ["199,500원", "244,500원", "−12,000원", "0원"];
    const [index, setIndex] = useState(0);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <strong style={{ fontSize: 24, fontVariantNumeric: "tabular-nums" }}>
          <RolledText text={AMOUNTS[index]!} />
        </strong>
        <button type="button" onClick={() => setIndex((current) => (current + 1) % AMOUNTS.length)}>
          다음 값
        </button>
      </div>
    );
  },
};

/** 숫자로 시작하지 않는 글자는 굴리지 않는다 */
export const NotAnAmount: Story = {
  args: { text: "불러오지 못했어요" },
};
