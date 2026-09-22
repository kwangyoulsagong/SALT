import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

/** 모드 스위치 줄. 데이터 전에도 자리를 지켜 판단이 도착할 때 아래가 밀리지 않는다 */
const MODE_ROW_HEIGHT = "32px";

export const coachBlocks = style({
  /** 부모 열이 `align-items: flex-start` 라 내용 폭으로 줄었다(실측 299px / 패널 490px) */
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xlarge,
});

export const modeRow = style({
  minHeight: MODE_ROW_HEIGHT,
  display: "flex",
  alignItems: "center",
});
