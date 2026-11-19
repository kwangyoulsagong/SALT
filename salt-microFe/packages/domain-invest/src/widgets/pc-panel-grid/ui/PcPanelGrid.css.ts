import { style } from "@vanilla-extract/css";

/**
 * 격자 높이 — 화면 높이에서 머리(52) · 화면 제목 · 위아래 여백을 뺀 나머지. `MovableGrid` 는 부모 높이를 그대로 쓴다.
 * 낮은 창에서도 대화 칸이 칩 · 입력 · 몇 줄을 담게 최소 560(1280×720 노트북 창 실측 — 체크리스트)
 */
export const frame = style({ height: "calc(100dvh - 150px)", minHeight: "560px" });
