import { style } from "@vanilla-extract/css";

/**
 * 상세 본문 틀(`FE-REQ-049` FR-2 · 3 · 11, `screen-desktop.md` §4 "상세") — 알약 탭 → 왼쪽 패널 격자 + 오른쪽 고정 열 360.
 * 1280 미만은 한 열이고 고정 열은 탭 하나("내 거래")로 들어간다 — 그 판정은 JS(`useWideViewport`)라 여기는 넓은 배치만 그린다
 */
const WIDE = "screen and (min-width: 1280px)";
export const ASIDE_WIDTH = 360;
/** 고정 열이 붙는 높이 — 본문 패널 안 여백(12)만큼 띄운다 */
const STICKY_TOP = 12;

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
});

export const tabBar = style({ minWidth: 0 });

export const grid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
  "@media": {
    [WIDE]: { gridTemplateColumns: `minmax(0, 1fr) ${ASIDE_WIDTH}px` },
  },
});

/** `hidden` 속성이 `display` 에 지지 않게 — 좁은 폭 "내 거래" 탭에서 왼쪽 칸을 숨긴다 */
const HIDDEN = { "&[hidden]": { display: "none" } } as const;

export const main = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  selectors: HIDDEN,
});

/**
 * 오른쪽 고정 열 — 스크롤에 붙는다(B9: 왼쪽 열 높이에 맞춰 늘이지 않는다). 화면보다 길면 열 안에서 스크롤한다 —
 * 붙은 채 아래쪽이 화면 밖에 남아 닿지 못하는 일이 없게
 */
export const aside = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  // 1280 미만 "내 거래" 탭 — 입력 폼이 본문 폭(1,100+)으로 늘어나지 않게 글 폭 상한과 같은 720
  maxWidth: "720px",
  selectors: HIDDEN,
  "@media": {
    [WIDE]: {
      position: "sticky",
      top: `${STICKY_TOP}px`,
      maxHeight: `calc(100vh - ${STICKY_TOP * 2}px)`,
      overflowY: "auto",
      overscrollBehavior: "contain",
      scrollbarWidth: "thin",
    },
  },
});

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  selectors: HIDDEN,
});
