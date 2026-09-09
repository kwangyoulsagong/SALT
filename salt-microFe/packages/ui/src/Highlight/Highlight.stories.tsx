import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Highlight } from "./Highlight";

const meta = {
  title: "Components/Highlight",
  component: Highlight,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: ["brand", "ai", "up", "down", "neutral"],
      description: "강조 색",
    },
    children: { control: "text", description: "강조할 조각" },
  },
} satisfies Meta<typeof Highlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "72점" } };

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "grid", gap: 8, fontSize: 15 }}>
      <span>
        브랜드 <Highlight tone="brand">강조</Highlight>
      </span>
      <span>
        AI 생성물 <Highlight tone="ai">72점</Highlight>
      </span>
      <span>
        상승 <Highlight tone="up">+3.4%</Highlight>
      </span>
      <span>
        하락 <Highlight tone="down">−1.8%</Highlight>
      </span>
      <span>
        중립 <Highlight tone="neutral">005930</Highlight>
      </span>
    </div>
  ),
};

/** 검색어 일치 표시. */
export const SearchMatch: Story = {
  args: { children: "" },
  render: () => (
    <p style={{ fontSize: 15, maxWidth: 320 }}>
      <Highlight tone="neutral">삼성</Highlight>전자 · 
      <Highlight tone="neutral">삼성</Highlight>바이오로직스
    </p>
  ),
};

/** 문장 안에서 여러 조각을 강조할 때. */
export const InSentence: Story = {
  args: { children: "" },
  render: () => (
    <p style={{ fontSize: 15, maxWidth: 360, lineHeight: 1.6 }}>
      이 유형 신호는 최근 <Highlight tone="ai">42회</Highlight>에서 승률{" "}
      <Highlight tone="up">57%</Highlight>, 최대낙폭{" "}
      <Highlight tone="down">−11%</Highlight>였습니다.
    </p>
  ),
};
