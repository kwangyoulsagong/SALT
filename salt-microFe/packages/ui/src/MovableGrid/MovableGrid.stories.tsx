import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { X } from "lucide-react";
import { MovableGrid } from "./MovableGrid";
import { panel, removePanel, split } from "./layoutTree";
import type { LayoutNode } from "./layoutTree";
import { IconButton } from "../IconButton/IconButton";
import { KeyValueList } from "../KeyValueList/KeyValueList";
import { ListRow } from "../ListRow/ListRow";
import { NumberText } from "../NumberText/NumberText";
import { Sparkline } from "../Sparkline/Sparkline";

const meta = {
  title: "Components/MovableGrid",
  component: MovableGrid,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    gap: {
      control: "number",
      description: "칸 사이 간격 겸 구분선 두께(px)",
    },
  },
} satisfies Meta<typeof MovableGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const TITLES: Record<string, string> = {
  chart: "차트",
  book: "호가",
  trades: "체결",
  watchlist: "관심 종목",
  news: "뉴스",
};

const PanelBody = ({ id }: { id: string }) => {
  if (id === "chart") {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 16 }}>
        <Sparkline
          points={[100, 104, 102, 108, 106, 112, 118]}
          label="차트 자리"
          width={220}
          height={80}
          strokeWidth={2}
        />
      </div>
    );
  }

  if (id === "book") {
    return (
      <div style={{ padding: 16 }}>
        <KeyValueList
          items={[
            { label: "74,400", value: "1,204", tone: "down" },
            { label: "74,300", value: "3,820", tone: "down" },
            { label: "74,200", value: "2,110", tone: "up" },
            { label: "74,100", value: "980", tone: "up" },
          ]}
        />
      </div>
    );
  }

  if (id === "watchlist") {
    return (
      <div>
        {[
          { name: "삼성전자", code: "005930", change: 2.13 },
          { name: "카카오", code: "035720", change: -1.42 },
        ].map((item) => (
          <ListRow
            key={item.code}
            title={item.name}
            caption={item.code}
            trailingTop={<NumberText value={item.change} unit="%" size="t7" signed />}
            divider
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, color: "#8B95A1", fontSize: 13 }}>
      {TITLES[id] ?? id} 내용이 들어가는 자리
    </div>
  );
};

/**
 * 머리말을 잡아 다른 칸의 위·아래·왼쪽·오른쪽 삼각형 구역에 놓으면 그 방향으로 나뉜다.
 * 구분선은 끌어서, 또는 Tab으로 포커스를 주고 화살표 키로 조절한다.
 */
export const Default: Story = {
  args: { layout: panel("chart"), onLayoutChange: () => {}, renderPanel: () => null },
  render: function DefaultStory() {
    const [layout, setLayout] = useState<LayoutNode>(() =>
      split(
        "row",
        panel("chart"),
        split("column", panel("book"), panel("trades")),
        0.62
      )
    );

    return (
      <div style={{ height: 480, padding: 12, background: "#F2F4F6" }}>
        <MovableGrid
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <PanelBody id={id} />}
          renderPanelTitle={(id) => TITLES[id] ?? id}
        />
      </div>
    );
  },
};

/** 칸을 닫으면 남은 쪽이 빈 자리를 그대로 이어받는다(가지 접힘). */
export const Closable: Story = {
  args: { layout: panel("chart"), onLayoutChange: () => {}, renderPanel: () => null },
  render: function ClosableStory() {
    const [layout, setLayout] = useState<LayoutNode | null>(() =>
      split(
        "row",
        split("column", panel("watchlist"), panel("news")),
        split("column", panel("chart"), split("row", panel("book"), panel("trades"))),
        0.3
      )
    );

    if (!layout) {
      return (
        <div style={{ padding: 24, color: "#8B95A1" }}>
          칸을 모두 닫았습니다.
        </div>
      );
    }

    return (
      <div style={{ height: 520, padding: 12, background: "#F2F4F6" }}>
        <MovableGrid
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <PanelBody id={id} />}
          renderPanelTitle={(id) => TITLES[id] ?? id}
          renderPanelActions={(id) => (
            <IconButton
              icon={<X size={14} aria-hidden="true" />}
              label={`${TITLES[id] ?? id} 칸 닫기`}
              size="sm"
              onClick={() => setLayout((prev) => (prev ? removePanel(prev, id) : prev))}
            />
          )}
        />
      </div>
    );
  },
};

/** 칸 하나뿐이면 구분선이 없다. */
export const SinglePanel: Story = {
  args: { layout: panel("chart"), onLayoutChange: () => {}, renderPanel: () => null },
  render: function SingleStory() {
    const [layout, setLayout] = useState<LayoutNode>(() => panel("chart"));

    return (
      <div style={{ height: 280, padding: 12, background: "#F2F4F6" }}>
        <MovableGrid
          layout={layout}
          onLayoutChange={setLayout}
          renderPanel={(id) => <PanelBody id={id} />}
          renderPanelTitle={(id) => TITLES[id] ?? id}
        />
      </div>
    );
  },
};

/** 간격을 넓히면 구분선을 잡기 쉬워진다. */
export const WideGap: Story = {
  args: { layout: panel("chart"), onLayoutChange: () => {}, renderPanel: () => null },
  render: function WideGapStory() {
    const [layout, setLayout] = useState<LayoutNode>(() =>
      split("column", panel("chart"), panel("trades"), 0.7)
    );

    return (
      <div style={{ height: 360, padding: 12, background: "#F2F4F6" }}>
        <MovableGrid
          layout={layout}
          onLayoutChange={setLayout}
          gap={14}
          renderPanel={(id) => <PanelBody id={id} />}
          renderPanelTitle={(id) => TITLES[id] ?? id}
        />
      </div>
    );
  },
};
