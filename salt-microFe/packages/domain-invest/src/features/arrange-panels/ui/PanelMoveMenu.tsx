"use client";

import { Move } from "lucide-react";

import { IconButton } from "@repo/ui/iconButton";
import { movePanel, type DropZone, type LayoutNode } from "@repo/ui/layoutTree";
import { Menu, type MenuItem } from "@repo/ui/menu";

import { ARRANGE_PANELS_MESSAGES } from "../model/messages";
import { PANEL_DROP_ZONES } from "../model/constants";

const RESET_ID = "reset";
const SEP = "::";

export interface PanelMoveMenuProps {
  /** 이 메뉴가 붙은 칸 */
  panelId: string;
  /** 칸 id → 이름(격자에 놓인 칸 전부) */
  labels: Record<string, string>;
  layout: LayoutNode;
  onChange: (next: LayoutNode) => void;
  onReset: () => void;
}

/**
 * 칸 옮기기 메뉴(F006 A절 · `FE-REQ-030` FR-54) — 머리말 끌기는 포인터 전용이라 키보드 · 화면 읽기 프로그램 사용자가 같은 일을
 * 여기서 한다: 옆 칸마다 왼쪽 · 오른쪽 · 위 · 아래에 놓기 + 기본 배치로. 옮기기는 `layoutTree` `movePanel` 그대로(끌기와 같은 결과).
 */
export const PanelMoveMenu = ({ panelId, labels, layout, onChange, onReset }: PanelMoveMenuProps) => {
  const name = labels[panelId] ?? panelId;
  const items: MenuItem[] = [
    ...Object.keys(labels)
      .filter((id) => id !== panelId)
      .flatMap((target) =>
        PANEL_DROP_ZONES.map((zone) => ({
          id: `${target}${SEP}${zone}`,
          label: ARRANGE_PANELS_MESSAGES.placeBeside(labels[target] ?? target, zone),
        }))
      ),
    { id: RESET_ID, label: ARRANGE_PANELS_MESSAGES.reset },
  ];

  const select = (id: string) => {
    if (id === RESET_ID) return onReset();
    const [target, zone] = id.split(SEP) as [string, DropZone];
    onChange(movePanel(layout, panelId, target, zone));
  };

  return (
    <Menu
      label={ARRANGE_PANELS_MESSAGES.menuLabel(name)}
      items={items}
      onSelect={select}
      trigger={(props) => (
        <IconButton {...props} icon={<Move size={14} aria-hidden="true" />} label={ARRANGE_PANELS_MESSAGES.menuButton(name)} size="sm" variant="ghost" />
      )}
    />
  );
};
