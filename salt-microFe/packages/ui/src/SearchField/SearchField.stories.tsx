import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchField } from "./SearchField";
import { ListRow } from "../ListRow/ListRow";
import { AssetIcon } from "../AssetIcon/AssetIcon";
import { EmptyState } from "../EmptyState/EmptyState";

const meta = {
  title: "Components/SearchField",
  component: SearchField,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: "text", description: "현재 검색어" },
    placeholder: { control: "text", description: "빈 값일 때 안내 문구" },
    label: { control: "text", description: "스크린 리더가 읽을 검색창 이름" },
    disabled: { control: "boolean", description: "비활성화 상태" },
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    onChange: () => {},
    placeholder: "종목명 또는 코드",
  },
};

/** 값이 있을 때만 지우기 버튼이 나온다. */
export const WithValue: Story = {
  args: {
    value: "삼성전자",
    onChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    value: "",
    disabled: true,
    onChange: () => {},
  },
};

/** Enter로 제출하고, 지우기 버튼으로 비운다. */
export const Interactive: Story = {
  args: { value: "", onChange: () => {} },
  render: function InteractiveStory() {
    const stocks = [
      { name: "삼성전자", code: "005930" },
      { name: "에스케이하이닉스", code: "000660" },
      { name: "카카오", code: "035720" },
    ];
    const [query, setQuery] = useState("");

    const results = stocks.filter(
      (stock) => stock.name.includes(query) || stock.code.includes(query)
    );

    return (
      <div style={{ maxWidth: 360, display: "grid", gap: 12 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="종목명 또는 코드"
        />

        <div style={{ background: "#FFFFFF" }}>
          {results.length > 0 ? (
            results.map((stock) => (
              <ListRow
                key={stock.code}
                title={stock.name}
                caption={stock.code}
                leading={<AssetIcon symbol={stock.code} size="lg" />}
              />
            ))
          ) : (
            <EmptyState
              title="검색 결과가 없습니다"
              description="다른 종목명이나 코드로 다시 검색해 보세요."
            />
          )}
        </div>
      </div>
    );
  },
};

export const Narrow: Story = {
  args: { value: "", onChange: () => {} },
  render: () => (
    <div style={{ width: 320 }}>
      <SearchField
        value="아주 긴 검색어가 들어오는 경우를 확인합니다"
        onChange={() => {}}
      />
    </div>
  ),
};
