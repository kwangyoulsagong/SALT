import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toggle } from "./Toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
      description: "켜짐 여부. role=\"switch\"의 aria-checked로 전달된다",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    label: {
      control: "text",
      description: "옆에 보이는 이름. 없으면 aria-label을 넘겨야 한다",
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    label: "체결 알림",
    onChange: () => {},
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    label: "체결 알림",
    onChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    label: "준비 중인 기능",
    disabled: true,
    onChange: () => {},
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    label: "항상 켜짐",
    disabled: true,
    onChange: () => {},
  },
};

/** Tab으로 이동하고 Space·Enter로 켜고 끈다. */
export const Interactive: Story = {
  args: { checked: false, onChange: () => {} },
  render: function InteractiveStory() {
    const [settings, setSettings] = useState({
      trade: true,
      target: false,
      news: false,
    });

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Toggle
          label="체결 알림"
          checked={settings.trade}
          onChange={(next) => setSettings((prev) => ({ ...prev, trade: next }))}
        />
        <Toggle
          label="목표가 알림"
          checked={settings.target}
          onChange={(next) =>
            setSettings((prev) => ({ ...prev, target: next }))
          }
        />
        <Toggle
          label="뉴스 알림"
          checked={settings.news}
          onChange={(next) => setSettings((prev) => ({ ...prev, news: next }))}
        />
      </div>
    );
  },
};

/** 라벨 없이 쓰려면 aria-label이 필요하다. */
export const IconOnlyWithAriaLabel: Story = {
  args: {
    checked: true,
    onChange: () => {},
    "aria-label": "야간 시세 알림",
  },
};
