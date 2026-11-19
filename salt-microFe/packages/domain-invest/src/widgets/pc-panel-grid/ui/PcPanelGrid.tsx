"use client";

import type { ReactNode } from "react";

import { MovableGrid } from "@repo/ui/movableGrid";
import type { LayoutNode } from "@repo/ui/layoutTree";

import { PanelMoveMenu, usePanelArrangement } from "@/features/arrange-panels";

import { frame } from "./PcPanelGrid.css";

export interface GridPanel {
  id: string;
  /** 칸 머리말 · 옮기기 손잡이 · 메뉴의 이름 */
  title: string;
  content: ReactNode;
}

export interface PcPanelGridProps {
  /** 칸 내용은 페이지가 넣는다 — 이 위젯이 다른 위젯을 import 하면 같은 레이어 교차다(`fsd-widgets.md`, `FE-REQ-030` FR-58) */
  panels: GridPanel[];
  defaultLayout: LayoutNode;
}

/**
 * PC 이동식 격자(F006 A절 · `FE-REQ-030` FR-50~58) — `MovableGrid` + 칸 옮기기 메뉴 + 배치 저장.
 * 머리말을 끌어 옮기고 구분선을 끌거나 화살표 키로 크기를 바꾼다. 키보드로 옮기기는 칸마다 메뉴(FR-54).
 * 저장 배치를 읽는 동안은 같은 높이 틀만 — 기본 배치를 그렸다가 저장 배치로 칸이 뛰지 않게.
 */
export const PcPanelGrid = ({ panels, defaultLayout }: PcPanelGridProps) => {
  const { layout, isLoading, change, reset } = usePanelArrangement(
    panels.map((item) => item.id),
    defaultLayout
  );
  const byId = new Map(panels.map((item) => [item.id, item]));
  const labels = Object.fromEntries(panels.map((item) => [item.id, item.title]));

  if (isLoading) return <div className={frame} aria-busy="true" />;
  return (
    <div className={frame}>
      <MovableGrid
        layout={layout}
        onLayoutChange={change}
        renderPanel={(id) => byId.get(id)?.content ?? null}
        renderPanelTitle={(id) => labels[id] ?? id}
        panelLabel={(id) => labels[id] ?? id}
        renderPanelActions={(id) => (
          <PanelMoveMenu panelId={id} labels={labels} layout={layout} onChange={change} onReset={reset} />
        )}
      />
    </div>
  );
};
