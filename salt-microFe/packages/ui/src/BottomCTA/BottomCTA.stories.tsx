import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Star } from "lucide-react";
import { BottomCTA } from "./BottomCTA";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";

const meta = {
  title: "Components/BottomCTA",
  component: BottomCTA,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "inline-radio",
      options: ["single", "double"],
      description: "버튼을 1칸으로 둘지 2칸으로 나눌지",
    },
    fixed: {
      control: "boolean",
      description: "화면 하단에 고정. safe-area 여백이 함께 붙는다",
    },
  },
} satisfies Meta<typeof BottomCTA>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: {
    children: <Button fullWidth>주문하기</Button>,
  },
};

export const Double: Story = {
  args: {
    layout: "double",
    children: (
      <>
        <Button variant="ghost" fullWidth>
          매도
        </Button>
        <Button fullWidth>매수</Button>
      </>
    ),
  },
};

/** 종목 상세 하단 — 관심 토글 + 매도·매수 3버튼 조합. */
export const WithLeadingAction: Story = {
  args: {
    layout: "double",
    leading: (
      <IconButton
        icon={<Star size={22} aria-hidden="true" />}
        label="관심 종목에 추가"
        variant="tonal"
        size="lg"
      />
    ),
    children: (
      <>
        <Button variant="ghost" fullWidth>
          매도
        </Button>
        <Button fullWidth>매수</Button>
      </>
    ),
  },
};

/** 스크롤해도 하단에 붙어 있다. */
export const Fixed: Story = {
  args: {
    fixed: true,
    layout: "double",
    children: (
      <>
        <Button variant="ghost" fullWidth>
          취소
        </Button>
        <Button fullWidth>확인</Button>
      </>
    ),
  },
  render: (args) => (
    <div style={{ height: 400, overflowY: "auto", position: "relative" }}>
      <div style={{ height: 800, padding: 20 }}>아래로 스크롤해 보세요.</div>
      <BottomCTA {...args} />
    </div>
  ),
};

export const Narrow: Story = {
  args: { children: null },
  render: () => (
    <div style={{ width: 320, border: "1px solid #E5E8EB" }}>
      <BottomCTA
        layout="double"
        leading={
          <IconButton
            icon={<Star size={22} aria-hidden="true" />}
            label="관심 종목에 추가"
            variant="tonal"
            size="lg"
          />
        }
      >
        <Button variant="ghost" fullWidth>
          매도
        </Button>
        <Button fullWidth>매수</Button>
      </BottomCTA>
    </div>
  ),
};
