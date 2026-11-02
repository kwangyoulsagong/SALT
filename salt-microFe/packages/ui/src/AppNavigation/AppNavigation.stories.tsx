import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChartLine, House, PiggyBank, Wallet } from "lucide-react";

import { AppNavigation } from "./AppNavigation";
import type { AppNavigationItem } from "./AppNavigation";

const iconProps = { size: 20, "aria-hidden": true } as const;

const items: AppNavigationItem[] = [
  { id: "home", label: "홈", href: "#home", icon: <House {...iconProps} />, active: true, accentColor: "#3182F6" },
  { id: "savings", label: "저축", href: "#savings", icon: <PiggyBank {...iconProps} /> },
  { id: "household", label: "가계부", href: "#household", icon: <Wallet {...iconProps} />, disabledReason: "준비 중" },
  { id: "invest", label: "투자", href: "#invest", icon: <ChartLine {...iconProps} /> },
];

const Body = () => (
  <div style={{ padding: 16, minHeight: 600, background: "#F2F4F6" }}>
    본문 — 1024 이상은 왼쪽 레일, 768~1023 은 하단 탭이 보인다(뷰포트 크기를 바꿔 본다)
  </div>
);

const meta = {
  title: "Components/AppNavigation",
  component: AppNavigation,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text", description: "스크린 리더가 읽을 내비게이션 이름" },
  },
  args: {
    items,
    children: <Body />,
    headerEnd: <span style={{ fontSize: 14 }}>계정</span>,
  },
} satisfies Meta<typeof AppNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 데스크톱(1024 이상) — 왼쪽 레일 */
export const Default: Story = {};

/** 태블릿 폭(768~1023) — 하단 탭 */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: "tablet" } },
};

/** 지금 탭이 없는 화면(설정 등) — 모든 탭이 3단 색 */
export const NoActiveTab: Story = {
  args: { items: items.map((item) => ({ ...item, active: false })) },
};

/** 긴 이름 — 레일 56 폭에서 말줄임 */
export const LongLabel: Story = {
  args: {
    items: items.map((item) => (item.id === "invest" ? { ...item, label: "투자 포트폴리오" } : item)),
  },
};
