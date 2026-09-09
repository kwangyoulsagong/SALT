import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListGroup } from "./ListGroup";
import { ListRow } from "../ListRow/ListRow";
import { SectionBand } from "../SectionBand/SectionBand";
import { NumberText } from "../NumberText/NumberText";

const meta = {
  title: "Components/ListGroup",
  component: ListGroup,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "그룹 제목",
    },
    count: {
      control: "number",
      description: "제목 옆 항목 수",
    },
  },
} satisfies Meta<typeof ListGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { name: "삼성전자", code: "005930", price: 74200 },
  { name: "에스케이하이닉스", code: "000660", price: 198400 },
  { name: "카카오", code: "035720", price: 41250 },
];

export const Default: Story = {
  args: {
    title: "보유 종목",
    count: rows.length,
    children: rows.map((row) => (
      <ListRow
        key={row.code}
        title={row.name}
        caption={row.code}
        trailingTop={<NumberText value={row.price} unit="원" size="t6" />}
      />
    )),
  },
};

export const WithAction: Story = {
  args: {
    title: "관심 종목",
    count: 12,
    action: (
      <button
        type="button"
        style={{
          border: "none",
          background: "none",
          color: "#6B7684",
          cursor: "pointer",
        }}
      >
        더보기
      </button>
    ),
    children: rows.slice(0, 2).map((row) => (
      <ListRow key={row.code} title={row.name} caption={row.code} chevron />
    )),
  },
};

export const WithoutHeader: Story = {
  args: {
    children: rows.map((row) => (
      <ListRow key={row.code} title={row.name} caption={row.code} />
    )),
  },
};

/** 그룹 사이는 카드가 아니라 밴드로 끊는다 (FE-REQ-005 D-8). */
export const GroupsSeparatedByBand: Story = {
  args: { children: null },
  render: () => (
    <div style={{ background: "#F2F4F6" }}>
      <ListGroup title="보유 종목" count={3}>
        {rows.map((row) => (
          <ListRow key={row.code} title={row.name} caption={row.code} />
        ))}
      </ListGroup>
      <SectionBand />
      <ListGroup title="관심 종목" count={2}>
        {rows.slice(0, 2).map((row) => (
          <ListRow key={row.code} title={row.name} caption={row.code} />
        ))}
      </ListGroup>
    </div>
  ),
};

export const Empty: Story = {
  args: {
    title: "보유 종목",
    count: 0,
    children: null,
  },
};
