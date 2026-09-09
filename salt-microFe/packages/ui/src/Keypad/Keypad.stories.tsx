import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Keypad } from "./Keypad";
import { TextField } from "../TextField/TextField";

const meta = {
  title: "Components/Keypad",
  component: Keypad,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    maxLength: { control: "number", description: "최대 자릿수" },
    extraKey: {
      control: "inline-radio",
      options: ["00", ".", "none"],
      description: "0 왼쪽 칸에 넣을 키",
    },
    disabled: { control: "boolean", description: "비활성화 상태" },
  },
} satisfies Meta<typeof Keypad>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "", onChange: () => {} },
  render: function DefaultStory() {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 320, display: "grid", gap: 16 }}>
        <output
          style={{
            fontSize: 30,
            fontWeight: 700,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value ? Number(value).toLocaleString("ko-KR") : "0"}
        </output>
        <Keypad value={value} onChange={setValue} />
      </div>
    );
  },
};

/** 주문 금액 입력 — hero 입력칸과 붙여 쓴다. */
export const WithHeroField: Story = {
  args: { value: "", onChange: () => {} },
  render: function WithHeroFieldStory() {
    const [value, setValue] = useState("74200");
    return (
      <div style={{ maxWidth: 320, display: "grid", gap: 24 }}>
        <TextField
          label="주문 단가"
          variant="hero"
          value={value ? Number(value).toLocaleString("ko-KR") : "0"}
          readOnly
          onChange={() => {}}
          trailing={<span style={{ fontSize: 20 }}>원</span>}
        />
        <Keypad value={value} onChange={setValue} maxLength={10} />
      </div>
    );
  },
};

export const DecimalKey: Story = {
  args: { value: "", onChange: () => {} },
  render: function DecimalStory() {
    const [value, setValue] = useState("0.");
    return (
      <div style={{ maxWidth: 320, display: "grid", gap: 16 }}>
        <output style={{ fontSize: 22, textAlign: "right" }}>{value || "0"}</output>
        <Keypad value={value} onChange={setValue} extraKey="." />
      </div>
    );
  },
};

export const WithoutExtraKey: Story = {
  args: { value: "12", onChange: () => {}, extraKey: "none" },
};

export const Disabled: Story = {
  args: { value: "12", onChange: () => {}, disabled: true },
};
