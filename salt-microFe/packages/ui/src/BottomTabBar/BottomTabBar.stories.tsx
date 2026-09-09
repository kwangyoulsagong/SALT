import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, Home, PieChart, Search, Settings } from "lucide-react";
import { BottomTabBar } from "./BottomTabBar";
import type { BottomTabItems } from "./BottomTabBar";
import { Badge } from "../Badge/Badge";

const items: BottomTabItems = [
  { value: "home", label: "홈", icon: <Home size={20} aria-hidden="true" /> },
  {
    value: "search",
    label: "탐색",
    icon: <Search size={20} aria-hidden="true" />,
  },
  {
    value: "portfolio",
    label: "내 자산",
    icon: <PieChart size={20} aria-hidden="true" />,
  },
  {
    value: "alerts",
    label: "알림 3건",
    icon: <Bell size={20} aria-hidden="true" />,
    badge: <Badge tone="up" size="sm">3</Badge>,
  },
  {
    value: "settings",
    label: "설정",
    icon: <Settings size={20} aria-hidden="true" />,
  },
];

const meta = {
  title: "Components/BottomTabBar",
  component: BottomTabBar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "선택된 탭의 value",
    },
    fixed: {
      control: "boolean",
      description: "화면 하단에 고정",
    },
    label: {
      control: "text",
      description: "스크린 리더가 읽을 내비게이션 이름",
    },
  },
} satisfies Meta<typeof BottomTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items,
    value: "home",
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: { items, value: "home", onChange: () => {} },
  render: function InteractiveStory() {
    const [value, setValue] = useState("home");
    return <BottomTabBar items={items} value={value} onChange={setValue} />;
  },
};

/** 탭이 적으면 각 탭이 넓어진다. 타입상 최대 5개까지만 넘길 수 있다. */
export const ThreeTabs: Story = {
  args: {
    items: [items[0], items[1], items[2]] as BottomTabItems,
    value: "search",
    onChange: () => {},
  },
};

export const Narrow: Story = {
  args: { items, value: "portfolio", onChange: () => {} },
  render: (args) => (
    <div style={{ width: 320, border: "1px solid #E5E8EB" }}>
      <BottomTabBar {...args} />
    </div>
  ),
};

/** 배지 개수는 색이 아니라 라벨 문구에도 담는다. */
export const WithBadge: Story = {
  args: {
    items,
    value: "alerts",
    onChange: () => {},
  },
};
