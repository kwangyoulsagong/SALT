import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TimelyTipCard } from "./TimelyTipCard";

const meta = {
  title: "Components/TimelyTipCard",
  component: TimelyTipCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    eyebrow: "이번에 해당될 수 있는 제도",
    title: "혼인신고한 해에 세금에서 빼 주는 50만 원",
    summary: "2024~2026년에 혼인신고를 하면 한 사람 50만 원까지 그해 세금이 줄어요. 예식일이 아니라 신고일이 기준이에요.",
    sourceUrl: "https://www.law.go.kr/",
    sourceName: "국가법령정보센터",
    sourceLabel: "공식 안내 보기",
    readMore: <a href="#tip">자세히</a>,
    dismissLabel: "이 팁 닫기",
    onDismiss: () => undefined,
  },
} satisfies Meta<typeof TimelyTipCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dismissing: Story = { args: { dismissing: true } };

/** 휴대폰 폭 — 공개 zone · 앱 웹뷰(360) */
export const Narrow: Story = { parameters: { viewport: { defaultViewport: "mobile1" } } };
