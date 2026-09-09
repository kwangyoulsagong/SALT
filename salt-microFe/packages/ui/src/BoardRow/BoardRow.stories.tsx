import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BoardRow } from "./BoardRow";
import { Badge } from "../Badge/Badge";

const meta = {
  title: "Components/BoardRow",
  component: BoardRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text", description: "글 제목" },
    excerpt: { control: "text", description: "본문 미리보기. 두 줄까지" },
    commentCount: { control: "number", description: "댓글 수" },
    likeCount: { control: "number", description: "좋아요 수" },
    divider: { control: "boolean", description: "아래 구분선" },
  },
} satisfies Meta<typeof BoardRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "손절선 잡는 기준 어떻게 정하세요?",
    excerpt:
      "저는 −8%로 두고 있는데 최근에 두 번 걸려서 다시 생각해보고 있습니다.",
    author: "투자자1234",
    time: "10분 전",
    commentCount: 12,
    likeCount: 34,
  },
};

export const Pressable: Story = {
  args: {
    title: "손절선 잡는 기준 어떻게 정하세요?",
    author: "투자자1234",
    time: "10분 전",
    commentCount: 12,
    onPress: () => {},
  },
};

export const WithBadge: Story = {
  args: {
    badge: <Badge tone="brand" size="sm">공지</Badge>,
    title: "커뮤니티 이용 규칙",
    author: "운영팀",
    time: "1일 전",
  },
};

export const TitleOnly: Story = {
  args: { title: "제목만 있는 글" },
};

/** 제목은 한 줄, 본문은 두 줄에서 자른다. */
export const LongText: Story = {
  args: {
    title:
      "아주 긴 제목이 들어오는 경우를 확인하기 위한 글입니다 여기서 잘려야 합니다",
    excerpt:
      "본문도 아주 길게 들어오는 경우를 확인합니다. 두 줄까지만 보여주고 나머지는 잘라야 합니다. 세 번째 줄은 보이지 않아야 정상입니다.",
    author: "투자자1234",
    time: "3시간 전",
    commentCount: 1204,
    likeCount: 8930,
  },
};

export const List: Story = {
  args: { title: "" },
  render: () => (
    <div style={{ background: "#FFFFFF", maxWidth: 420 }}>
      {["손절선 기준", "배당주 포트 공유", "세금 신고 후기"].map((title, index) => (
        <BoardRow
          key={title}
          title={title}
          author={`투자자${index + 1}`}
          time={`${index + 1}시간 전`}
          commentCount={(index + 1) * 3}
          onPress={() => {}}
          divider={index < 2}
        />
      ))}
    </div>
  ),
};
