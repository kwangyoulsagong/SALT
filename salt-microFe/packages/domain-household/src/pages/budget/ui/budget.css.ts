import { style } from "@vanilla-extract/css";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

/** 내 분류 패널 — 위 예산 편집기와 같은 폭(가계부 S1f). 가득 찬 패널이면 줄 끝 버튼이 화면 끝으로 밀린다 */
export const categoryPanel = style({ maxWidth: "640px" });
