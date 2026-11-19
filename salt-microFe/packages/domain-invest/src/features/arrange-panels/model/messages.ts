import type { DropZone } from "@repo/ui/layoutTree";

/** 놓는 쪽 이름 — 옆 칸 기준 */
const SIDE: Record<DropZone, string> = { left: "왼쪽", right: "오른쪽", top: "위", bottom: "아래" };

/** 칸 옮기기 문구(F006 A절 · `FE-REQ-030` FR-54) */
export const ARRANGE_PANELS_MESSAGES = {
  /** 메뉴 여는 버튼 · 메뉴 자체의 이름 */
  menuButton: (panel: string) => `${panel} 칸 옮기기 메뉴`,
  menuLabel: (panel: string) => `${panel} 칸을 어디에 놓을까요`,
  placeBeside: (target: string, side: DropZone) => `${target} ${SIDE[side]}에 놓기`,
  reset: "기본 배치로 되돌리기",
} as const;
