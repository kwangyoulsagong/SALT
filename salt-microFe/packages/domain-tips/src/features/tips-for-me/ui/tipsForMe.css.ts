import { style } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

/** 받는 중 — 사이드 행(52) 두 줄 모양 */
export const skeletons = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 실패 한 줄 + 다시 불러오기 — 좁은 사이드(312)라 줄이 넘치면 버튼이 아래로 */
export const statusRow = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

export const picks = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 받은 행 하나 — 자리 표시에서 바뀔 때 8px 아래에서 차례로(`enterReveal` — 줄인 모션이면 그 토큰이 끈다) */
export const pick = style({ ...enterReveal });
