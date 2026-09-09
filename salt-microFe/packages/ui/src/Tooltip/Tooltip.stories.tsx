import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { IconButton } from "../IconButton/IconButton";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
      description: "말풍선이 붙는 방향",
    },
    content: { control: "text", description: "설명 문구" },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** hover와 Tab 포커스 둘 다에서 열리고 ESC로 닫힌다. */
export const Default: Story = {
  args: {
    content: "최근 42회 신호의 승률입니다.",
    children: (
      <IconButton
        icon={<HelpCircle size={18} aria-hidden="true" />}
        label="승률 설명"
        size="sm"
      />
    ),
  },
};

export const AllPlacements: Story = {
  args: { content: "", children: null },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 48,
        padding: 48,
      }}
    >
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Tooltip key={placement} placement={placement} content={`${placement} 방향`}>
          <IconButton
            icon={<HelpCircle size={18} aria-hidden="true" />}
            label={`${placement} 설명`}
            size="sm"
            variant="tonal"
          />
        </Tooltip>
      ))}
    </div>
  ),
};

/** 긴 문구는 240px에서 줄바꿈된다. */
export const LongContent: Story = {
  args: {
    content:
      "MVRV Z-score는 시가총액과 실현시총의 차이를 표준편차로 나눈 값입니다. 과거 사이클 바닥 구간에서 낮게 나타났습니다.",
    children: (
      <IconButton
        icon={<HelpCircle size={18} aria-hidden="true" />}
        label="지표 설명"
        size="sm"
        variant="tonal"
      />
    ),
  },
};

/** 텍스트에도 붙일 수 있다. 다만 포커스를 받는 요소여야 키보드로 열린다. */
export const OnText: Story = {
  args: { content: "", children: null },
  render: () => (
    <p style={{ fontSize: 15 }}>
      점수는{" "}
      <Tooltip content="72점은 72% 확률이 아닙니다.">
        <button
          type="button"
          style={{
            border: "none",
            background: "none",
            padding: 0,
            font: "inherit",
            textDecoration: "underline dotted",
            cursor: "help",
          }}
        >
          72점
        </button>
      </Tooltip>{" "}
      입니다.
    </p>
  ),
};
