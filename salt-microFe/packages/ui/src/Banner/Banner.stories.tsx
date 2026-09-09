import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle } from "lucide-react";
import { Banner } from "./Banner";

const TONES = ["info", "warning", "error", "success", "neutral"] as const;

const meta = {
  title: "Components/Banner",
  component: Banner,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: TONES,
      description: "심각도. 색만으로 구분하지 않도록 문구를 함께 쓴다",
    },
    title: {
      control: "text",
      description: "굵은 첫 줄",
    },
    children: {
      control: "text",
      description: "본문",
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "참고",
    children: "표시된 수치는 실시간 시세와 다를 수 있습니다.",
  },
};

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {TONES.map((tone) => (
        <Banner key={tone} tone={tone} title={tone}>
          이 화면의 내용은 투자 권유가 아닙니다.
        </Banner>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    tone: "warning",
    title: "주문 전 확인",
    icon: <AlertTriangle size={16} />,
    children: "체결 수량과 단가를 다시 확인하세요.",
  },
};

export const WithoutTitle: Story = {
  args: {
    tone: "neutral",
    children: "최근 30일 기록만 표시됩니다.",
  },
};

export const LongText: Story = {
  args: {
    tone: "error",
    title: "저장하지 못했습니다",
    children:
      "네트워크 상태를 확인한 뒤 다시 시도하세요. 문제가 계속되면 잠시 후 다시 접속해 주세요. 입력한 내용은 이 화면을 벗어나면 사라집니다.",
  },
};

export const Narrow: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ width: 320 }}>
      <Banner tone="info" title="안내">
        폭 320px에서도 가로 스크롤이 생기지 않아야 한다.
      </Banner>
    </div>
  ),
};
