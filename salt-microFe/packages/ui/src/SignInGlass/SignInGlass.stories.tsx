import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SignInGlass } from "./SignInGlass";

const meta = {
  title: "Components/SignInGlass",
  component: SignInGlass,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    actionLabel: { control: "text", description: "단추 글 — 누른 뒤 일이 보이게" },
    description: { control: "text", description: "무엇이 가려졌는지 한 줄" },
    href: { control: "text", description: "로그인 주소(돌아올 주소 포함)" },
  },
} satisfies Meta<typeof SignInGlass>;

export default meta;
type Story = StoryObj<typeof meta>;

const Placeholder = () => (
  <div style={{ display: "grid", gap: 8, padding: 16 }}>
    {[72, 56, 88, 40].map((width) => (
      <div key={width} style={{ height: 14, width: `${width}%`, borderRadius: 4, background: "#E5E8EB" }} />
    ))}
  </div>
);

/** 자리 표시 위에 — 칸 모양이 비친다 */
export const OverPlaceholder: Story = {
  args: {
    actionLabel: "로그인하고 코치 판단 보기",
    description: "코치 판단은 로그인한 사람만 볼 수 있어요",
    href: "/?next=/investments/005930",
    children: <Placeholder />,
  },
};

/** 자리 표시 없이 — 막이 칸이 된다 */
export const Bare: Story = {
  args: { actionLabel: "로그인하고 거래 기록 보기", href: "/?next=/portfolio", minHeight: 120 },
};
