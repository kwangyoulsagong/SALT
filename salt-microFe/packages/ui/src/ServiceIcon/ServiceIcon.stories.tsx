import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ServiceIcon, type ServiceIconVariant } from "./ServiceIcon";

const meta = {
  title: "Components/ServiceIcon",
  component: ServiceIcon,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["mission", "analysis", "ranking", "tip", "social", "game", "household"],
      description: "3D 아이콘 종류 — 홈 카드: 저축 ranking · 가계부 household · 투자 analysis · 팁 tip",
    },
  },
} satisfies Meta<typeof ServiceIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "household" } };

const ALL: ServiceIconVariant[] = ["ranking", "household", "analysis", "tip", "mission", "social", "game"];

/** 한 벌 — 그림 파일은 앱의 `/assets/Icons` 에 있어 Storybook 에서는 자리만 보일 수 있다 */
export const AllVariants: Story = {
  args: { variant: "household" },
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      {ALL.map((variant) => (
        <ServiceIcon key={variant} variant={variant} />
      ))}
    </div>
  ),
};
