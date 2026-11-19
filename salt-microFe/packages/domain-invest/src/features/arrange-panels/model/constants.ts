/** 끌기 · 화살표 키 조절이 멈춘 뒤 이만큼 지나 한 번 저장 — 구분선을 끄는 동안 PUT 이 쏟아지지 않게(서버 분당 60) */
export const PANEL_LAYOUT_SAVE_DELAY_MS = 800;

/** 칸 하나가 옆 칸에 놓일 수 있는 쪽 — 메뉴 순서 */
export const PANEL_DROP_ZONES = ["left", "right", "top", "bottom"] as const;
