import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, MoreVertical, Share2, Trash2 } from "lucide-react";
import { Menu } from "./Menu";
import { IconButton } from "../IconButton/IconButton";

const items = [
  { id: "alert", label: "알림 만들기", icon: <Bell size={16} aria-hidden="true" /> },
  { id: "share", label: "공유하기", icon: <Share2 size={16} aria-hidden="true" /> },
  { id: "locked", label: "준비 중", disabled: true },
  {
    id: "delete",
    label: "삭제",
    icon: <Trash2 size={16} aria-hidden="true" />,
    tone: "danger" as const,
  },
];

const meta = {
  title: "Components/Menu",
  component: Menu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    align: {
      control: "inline-radio",
      options: ["start", "end"],
      description: "트리거 기준 정렬",
    },
    label: { control: "text", description: "스크린 리더가 읽을 메뉴 이름" },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 열고 ↑↓ Home End로 이동, Enter로 선택, ESC나 바깥 클릭으로 닫는다. */
export const Default: Story = {
  args: { items, trigger: () => null, onSelect: () => {} },
  render: function DefaultStory() {
    const [picked, setPicked] = useState("—");
    return (
      <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <Menu
          items={items}
          onSelect={setPicked}
          trigger={(triggerProps) => (
            <IconButton
              icon={<MoreVertical size={20} aria-hidden="true" />}
              label="더보기"
              {...triggerProps}
            />
          )}
        />
        <span style={{ fontSize: 13, color: "#8B95A1" }}>선택: {picked}</span>
      </div>
    );
  },
};

export const AlignStart: Story = {
  args: { items, trigger: () => null, onSelect: () => {}, align: "start" },
  render: (args) => (
    <div style={{ padding: 48 }}>
      <Menu
        {...args}
        trigger={(triggerProps) => (
          <IconButton
            icon={<MoreVertical size={20} aria-hidden="true" />}
            label="더보기"
            variant="tonal"
            {...triggerProps}
          />
        )}
      />
    </div>
  ),
};

/** 비활성 항목은 화살표 이동에서 건너뛴다. */
export const WithDisabledItem: Story = {
  args: { items, trigger: () => null, onSelect: () => {} },
  render: (args) => (
    <div style={{ padding: 48 }}>
      <Menu
        {...args}
        trigger={(triggerProps) => (
          <IconButton
            icon={<MoreVertical size={20} aria-hidden="true" />}
            label="더보기"
            {...triggerProps}
          />
        )}
      />
    </div>
  ),
};
