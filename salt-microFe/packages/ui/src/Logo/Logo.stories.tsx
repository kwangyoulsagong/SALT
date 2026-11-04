import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Logo } from "./Logo";

const meta = {
  title: "Components/Logo",
  component: Logo,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["full", "symbol"], description: "글자 로고 · 심볼만" },
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"], description: "높이 16 · 20 · 24 · 32" },
    theme: { control: "inline-radio", options: ["light", "dark"], description: "바탕 — 글자색만 바뀐다" },
    depth: { control: "boolean", description: "입체(기본) — 끄면 단색(16px · 한 색 자리)" },
    ripples: { control: "boolean", description: "심볼 아래 물결(심볼만 · 큰 자리)" },
    decorative: { control: "boolean", description: "이름이 붙은 링크 안이면 화면 리더에서 뺀다" },
  },
  args: { variant: "full", size: "sm", theme: "light" },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 머리 첫 칸 — 높이 20 글자 로고(1024 이상) */
export const Default: Story = {};

/** 심볼만 — 1024 미만 머리 */
export const Symbol: Story = { args: { variant: "symbol", size: "md" } };

/** 단색 — 16px 파비콘 · 한 색 자리 */
export const Flat: Story = { args: { variant: "symbol", size: "xs", depth: false } };

/** 입체 + 물결 — 앱 아이콘 · 큰 자리. 크기는 CSS 로 키운다(height 토큰은 32 까지) */
export const Depth: Story = {
  args: { variant: "symbol", size: "lg", ripples: true, className: "logo-depth-160" },
  render: (args) => (
    <div>
      <style>{".logo-depth-160{width:160px;height:160px}"}</style>
      <Logo {...args} />
    </div>
  ),
};

/** 어두운 바탕 — 글자만 흰색 */
export const Dark: Story = {
  args: { theme: "dark", size: "lg" },
  render: (args) => (
    <div style={{ padding: 24, background: "#191F28", display: "inline-block" }}>
      <Logo {...args} />
    </div>
  ),
};

/** 크기 검사(FR-5) — 16(단색) · 20 · 24 · 32 · 128(입체 + 물결). 글자 로고는 20 부터 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
        {(["xs", "sm", "md", "lg"] as const).map((size) => (
          <Logo key={size} variant="symbol" size={size} depth={size !== "xs"} />
        ))}
        <div style={{ width: 128, height: 128 }}>
          <Logo variant="symbol" size="lg" ripples className="logo-128" />
          <style>{".logo-128{width:128px;height:128px}"}</style>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <Logo key={size} size={size} />
        ))}
      </div>
    </div>
  ),
};
