import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 받는 중 — 사이드 행(52) 두 줄 모양 */
export const skeletons = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 실패 한 줄 + 다시 불러오기 — 좁은 사이드(312)라 줄이 넘치면 버튼이 아래로 */
export const statusRow = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });
