import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, Search } from "lucide-react";
import { AppBar } from "./AppBar";
import { Badge } from "../Badge/Badge";

const meta = {
  title: "Components/AppBar",
  component: AppBar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "화면 제목",
    },
    leading: {
      control: "inline-radio",
      options: ["none", "back", "logo"],
      description: "왼쪽 슬롯. back은 onBack을 호출한다",
    },
    sticky: {
      control: "boolean",
      description: "스크롤해도 상단에 고정",
    },
    bordered: {
      control: "boolean",
      description: "아래쪽 경계선",
    },
  },
} satisfies Meta<typeof AppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IconButton = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 40,
      height: 40,
      border: "none",
      background: "none",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

export const Default: Story = {
  args: {
    title: "종목 상세",
  },
};

export const WithBack: Story = {
  args: {
    title: "종목 상세",
    leading: "back",
    onBack: () => {},
  },
};

export const WithLogo: Story = {
  args: {
    leading: "logo",
    logo: <strong style={{ fontSize: 18 }}>SALT</strong>,
    actions: (
      <>
        <IconButton label="검색">
          <Search size={20} aria-hidden="true" />
        </IconButton>
        <IconButton label="알림 3건">
          <Bell size={20} aria-hidden="true" />
        </IconButton>
      </>
    ),
  },
};

/** 알림 배지는 actions 슬롯에 `Badge`를 함께 넣어 구성한다. */
export const WithNotificationBadge: Story = {
  args: {
    title: "알림",
    leading: "back",
    onBack: () => {},
    actions: <Badge tone="up">3</Badge>,
  },
};

export const Sticky: Story = {
  args: {
    title: "스크롤해도 고정",
    sticky: true,
  },
  render: (args) => (
    <div style={{ height: 240, overflowY: "auto" }}>
      <AppBar {...args} />
      <div style={{ height: 600, padding: 20 }}>아래로 스크롤해 보세요.</div>
    </div>
  ),
};

export const LongTitle: Story = {
  args: {
    title: "아주 긴 화면 제목이 들어오는 경우를 확인합니다",
    leading: "back",
    onBack: () => {},
    actions: (
      <IconButton label="검색">
        <Search size={20} aria-hidden="true" />
      </IconButton>
    ),
  },
};
