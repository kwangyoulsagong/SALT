import { style } from "@vanilla-extract/css";

/**
 * 하단 고정 버튼 자리(`FE-REQ-060` FR-M1 · M2 · M5) — 고정 버튼이 마지막 내용을 덮지 않게 같은 높이를 본문 끝에 비워 둔다
 * (버튼 48 + 위아래 12 · 12 + 홈 표시줄)
 */
export const spacer = style({ height: "calc(72px + env(safe-area-inset-bottom, 0px))", flexShrink: 0 });

/** 시트 안 본문 — 시트가 이미 좌우 여백을 준다 */
export const sheetBody = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });
