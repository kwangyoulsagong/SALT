import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListRow } from "./ListRow";
import { AssetIcon } from "../AssetIcon/AssetIcon";
import { NumberText } from "../NumberText/NumberText";

const meta = {
  title: "Components/ListRow",
  component: ListRow,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "행 제목",
    },
    caption: {
      control: "text",
      description: "제목 아래 보조 문구",
    },
    chevron: {
      control: "boolean",
      description: "오른쪽 이동 표시",
    },
    divider: {
      control: "boolean",
      description: "행 아래 구분선",
    },
  },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "삼성전자",
    caption: "005930",
  },
};

/** 종목 행 — 스토리보드에서 가장 많이 쓰이는 형태. */
export const Quote: Story = {
  args: {
    title: "삼성전자",
    caption: "005930 · 12주",
    leading: <AssetIcon symbol="005930" name="삼성전자" size="lg" />,
    trailingTop: <NumberText value={74200} unit="원" size="t6" />,
    trailingBottom: <NumberText value={2.13} unit="%" size="t7" signed />,
  },
};

export const Pressable: Story = {
  args: {
    title: "거래 내역",
    caption: "최근 30일",
    onPress: () => {},
    chevron: true,
  },
};

export const WithDivider: Story = {
  args: { title: "" },
  render: () => (
    <div style={{ background: "#FFFFFF" }}>
      <ListRow title="배당 알림" caption="매월 1일" divider />
      <ListRow title="목표가 알림" caption="80,000원 도달 시" divider />
      <ListRow title="공시 알림" caption="전체" />
    </div>
  ),
};

/** 긴 종목명과 긴 보조 문구가 들어와도 행 높이가 늘어나지 않는다. */
export const LongText: Story = {
  args: {
    title: "아주 긴 종목 이름이 들어오는 경우를 확인하는 행입니다",
    caption: "005930 · 아주 긴 보조 문구도 함께 들어오는 경우입니다",
    leading: <AssetIcon symbol="LONG" size="lg" />,
    trailingTop: <NumberText value={1284500} unit="원" size="t6" />,
    chevron: true,
    onPress: () => {},
  },
};

export const Narrow: Story = {
  args: { title: "" },
  render: () => (
    <div style={{ width: 320, background: "#FFFFFF" }}>
      <ListRow
        title="에스케이하이닉스"
        caption="000660"
        leading={<AssetIcon symbol="000660" size="lg" />}
        trailingTop={<NumberText value={198400} unit="원" size="t6" />}
        trailingBottom={<NumberText value={-1.42} unit="%" size="t7" signed />}
      />
    </div>
  ),
};
