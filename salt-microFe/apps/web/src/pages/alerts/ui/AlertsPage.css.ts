import { style } from "@vanilla-extract/css";

/** 한 열 — 목록 한 줄 최대 720(`screen-desktop.md` §2). 빈 상태도 이 열 안에서 가운데(전체 폭 가운데로 떠 있지 않게, 2026-11-18 실화면) */
export const page = style({ display: "flex", flexDirection: "column", gap: 8, maxWidth: 768, padding: "16px 24px", boxSizing: "border-box" });

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, maxWidth: 720 });

/** 글자색 1단 — `inherit` 은 회색 바탕 위 대비 미달이었다(axe color-contrast, 2026-11-18 확인 2회차) */
export const settingsLink = style({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "rgba(26,31,41,.89)", textDecoration: "none" });

/**
 * 설명 한 줄 — 공용 `panelDescription`(neutral 500, 흰 패널 위 3.03:1)은 쓰지 않는다. 글자색 2단(`screen-desktop.md` §2, 흰 위 4.99:1).
 * 공용 값은 참고 화면 실측값(8f3a2d99)이고 25곳이 쓴다 — 대비 수정은 새 요소에만(done 체크리스트 2-3). 2026-11-18 axe
 */
export const description = style({ margin: "-8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "rgba(22,31,46,.64)" });
