import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** `MarketBoardLayout.css.ts` 와 같은 접힘 폭(768px) */
const MOBILE = "screen and (max-width: 767px)";

/**
 * 띠 높이 = 작은 항목 3줄(56 × 3 + 틈 4 × 2). 대표 칸도 이 높이에 맞춘다(참고 화면 실측 176).
 * **청크가 오기 전 자리와 같아야** 탭 · 표가 밀리지 않는다(FR-8).
 */
const STRIP_HEIGHT = "176px";
/** 모바일: 대표 칸 176 + 틈 8 + 가로 스크롤 한 줄 56 */
const STRIP_HEIGHT_MOBILE = "240px";
/** 모바일 작은 항목 폭 — 옆 항목이 걸쳐 보여야 가로로 밀 수 있다는 것을 안다 */
const MOBILE_ITEM_WIDTH = "280px";

/** PC: 대표 | 작은 항목 열(3줄)들. 칸 사이는 세로 구분선(FR-7) */
export const strip = style({
  display: "grid",
  // 대표 칸을 넓게 — 작은 항목은 내용 폭(≈220px)이 정해져 있어 열이 넓으면 빈칸만 는다
  gridTemplateColumns: "minmax(0, 5fr) minmax(0, 6fr)",
  height: STRIP_HEIGHT,
  "@media": {
    [MOBILE]: {
      gridTemplateColumns: "minmax(0, 1fr)",
      gridTemplateRows: `${STRIP_HEIGHT} 56px`,
      rowGap: vars.space.sm,
      height: STRIP_HEIGHT_MOBILE,
    },
  },
});

const divided = {
  borderLeft: `1px solid ${vars.colors.border.light}`,
  paddingLeft: vars.space.md,
  marginLeft: vars.space.md,
};

export const featuredCell = style({
  minWidth: 0,
  height: STRIP_HEIGHT,
});

/** 작은 항목 — 세로로 3줄씩 채우고 다음 열로 넘어간다 */
export const itemGrid = style({
  ...divided,
  display: "grid",
  gridAutoFlow: "column",
  gridTemplateRows: "repeat(3, 56px)",
  gridAutoColumns: "minmax(0, 1fr)",
  rowGap: "4px",
  columnGap: vars.space.md,
  minWidth: 0,
  "@media": {
    [MOBILE]: {
      borderLeft: "none",
      paddingLeft: 0,
      marginLeft: 0,
      gridTemplateRows: "56px",
      gridAutoColumns: MOBILE_ITEM_WIDTH,
      overflowX: "auto",
      scrollSnapType: "x mandatory",
      // 페이지가 아니라 이 줄만 민다. 스크롤바는 표와 같이 숨긴다
      scrollbarWidth: "none",
    },
  },
});

/** 청크가 오기 전의 자리(FR-8 — CLS 0). 조회 실패면 띠가 사라지므로 이 자리도 청크가 오면 걷힌다 */
export const placeholder = style({
  height: STRIP_HEIGHT,
  "@media": {
    [MOBILE]: { height: STRIP_HEIGHT_MOBILE },
  },
});
