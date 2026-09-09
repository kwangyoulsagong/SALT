import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListFooter } from "./ListFooter";
import { ListGroup } from "../ListGroup/ListGroup";
import { ListRow } from "../ListRow/ListRow";
import { TextButton } from "../TextButton/TextButton";

const meta = {
  title: "Components/ListFooter",
  component: ListFooter,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    caption: { control: "text", description: "왼쪽 설명. 남은 개수 등" },
  },
} satisfies Meta<typeof ListFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: <TextButton chevron>더 보기</TextButton> },
};

export const CaptionOnly: Story = {
  args: { caption: "12건 중 3건 표시" },
};

export const CaptionWithAction: Story = {
  args: {
    caption: "12건 중 3건",
    children: <TextButton chevron>전체 보기</TextButton>,
  },
};

/** ListGroup 마지막 줄에 붙인 모습. */
export const InListGroup: Story = {
  args: { children: null },
  render: () => (
    <div style={{ background: "#F2F4F6", maxWidth: 420 }}>
      <ListGroup title="관심 종목" count={12}>
        <ListRow title="삼성전자" caption="005930" divider />
        <ListRow title="에스케이하이닉스" caption="000660" divider />
        <ListRow title="카카오" caption="035720" />
        <ListFooter caption="12건 중 3건">
          <TextButton chevron>전체 보기</TextButton>
        </ListFooter>
      </ListGroup>
    </div>
  ),
};
