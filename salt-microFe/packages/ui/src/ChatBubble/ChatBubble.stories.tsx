import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatBubble } from "./ChatBubble";
import { Badge } from "../Badge/Badge";
import { Chip } from "../Chip/Chip";
import { TextButton } from "../TextButton/TextButton";
import { Highlight } from "../Highlight/Highlight";

const meta = {
  title: "Components/ChatBubble",
  component: ChatBubble,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    role: {
      control: "inline-radio",
      options: ["user", "assistant"],
      description: "누가 한 말인지. user는 오른쪽, assistant는 왼쪽",
    },
    streaming: {
      control: "boolean",
      description: "답이 오는 중. 내용이 비어 있으면 점 세 개를 보여준다",
    },
    avatar: { control: "boolean", description: "assistant 아바타 표시" },
  },
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {
  args: {
    role: "assistant",
    avatar: true,
    children: "지금은 매수 쪽에 가깝습니다. 근거를 볼까요?",
    meta: "오후 2:31",
  },
};

export const User: Story = {
  args: {
    role: "user",
    children: "삼성전자 지금 사도 될까?",
    meta: "오후 2:30",
  },
};

/** 답을 기다리는 중 — 점 세 개가 깜빡인다. */
export const Streaming: Story = {
  args: { role: "assistant", avatar: true, streaming: true },
};

/** 실제 대화 화면. 목록을 감싸는 쪽에 role="log"를 준다. */
export const Conversation: Story = {
  args: { role: "assistant", children: null },
  render: () => (
    <div
      role="log"
      aria-live="polite"
      aria-label="코치와의 대화"
      style={{ display: "grid", gap: 16, maxWidth: 520 }}
    >
      <ChatBubble role="user" meta="오후 2:30">
        삼성전자 지금 사도 될까?
      </ChatBubble>

      <ChatBubble
        role="assistant"
        avatar
        meta="오후 2:31"
        footer={
          <>
            <Badge tone="ai" size="sm">
              AI 생성
            </Badge>
            <TextButton size="sm" tone="neutral">
              근거 자세히
            </TextButton>
            <TextButton size="sm" tone="neutral">
              도움 안 됨
            </TextButton>
          </>
        }
      >
        점수는 <Highlight tone="ai">72점</Highlight>으로 매수 쪽입니다. 다만 72점은
        72% 확률이 아닙니다. 이 유형 신호는 최근 42회에서 승률 57%, 평균 +3.1%였습니다.
      </ChatBubble>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip size="sm">근거가 뭐야?</Chip>
        <Chip size="sm">얼마나 살까?</Chip>
        <Chip size="sm">언제 팔아?</Chip>
      </div>
    </div>
  ),
};

/** 긴 답변과 줄바꿈 없는 문자열이 섞여도 말풍선을 넘지 않는다. */
export const LongMessage: Story = {
  args: {
    role: "assistant",
    avatar: true,
    children:
      "최근 30일 동안 매도 3건이 있었고 그중 2건은 90일 안에 가격이 회복됐습니다. 합계 −890,000원입니다. KRW-BTC-LONGSYMBOLWITHOUTSPACES-0000000000",
  },
};

export const WithoutAvatar: Story = {
  args: {
    role: "assistant",
    children: "아바타 없이도 왼쪽 정렬은 유지된다.",
  },
};
