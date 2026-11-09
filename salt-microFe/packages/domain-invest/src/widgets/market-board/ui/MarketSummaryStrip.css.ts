import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** `MarketBoardLayout.css.ts` 와 같은 접힘 폭(768px) */
const MOBILE = "screen and (max-width: 767px)";

/**
 * 띠 높이 = 작은 항목 3줄(56 × 3 + 틈 4 × 2). 대표 칸도 이 높이에 맞춘다(참고 화면 실측 176).
 * **청크가 오기 전 자리와 같아야** 탭 · 표가 밀리지 않는다(FR-8).
 */
const STRIP_HEIGHT = "176px";
/**
 * 모바일: 대표 칸은 내용 높이(여백 16 + 이름 20 + 가격 20 + 틈 8 + 차트 77 = 141) + 틈 8 + 가로 스크롤 한 줄 56.
 * PC 처럼 176 을 주면 차트 아래가 빈다.
 */
const FEATURED_HEIGHT_MOBILE = "141px";
const STRIP_HEIGHT_MOBILE = "205px";
/** 대표 칸 폭 — 참고 화면 실측 226px 근처 */
const FEATURED_WIDTH = "240px";
/**
 * 작은 항목 열 폭 — 참고 화면 254px. 260 에서 `3,681,000 -75,000 (2.00%)` 가 잘려 280.
 * 열이 화면 폭으로 늘어나면 항목 안이 빈칸만 는다
 */
const ITEM_COLUMN_WIDTH = "280px";
/**
 * 칸이 모자라면 항목 열이 여기까지 같이 줄어든다 — 세 열이 다 들어가게(1440 화면 = 열 272 · 1280 = 열 202).
 * 이보다 좁아야 하면 그때 띠 안에서 가로로 민다. 값이 긴 칸(`1,547,000 +31,000 (2.04%)`)은 원래처럼 말줄임
 */
const ITEM_COLUMN_MIN_WIDTH = "200px";
/** 오른쪽 상자 — 남는 폭을 쓴다. 이보다 좁아지면 숨긴다(아래 `WIDE`) */
const PANEL_MIN_WIDTH = "220px";

/** 모바일 작은 항목 폭 — 옆 항목이 걸쳐 보여야 가로로 밀 수 있다는 것을 안다 */
const MOBILE_ITEM_WIDTH = "280px";

/** PC: 대표 | 작은 항목 열(3줄)들. 칸 사이는 세로 구분선(FR-7) */
export const strip = style({
  display: "grid",
  // 대표 칸은 참고 화면처럼 좁게 고정한다(226 → 240). 늘리면 차트가 띠의 주인공이 된다.
  // 항목 열은 **칸 폭에 따라** 줄어든다(`minmax(0, max-content)`) — 다 들어가면 다 펼치고, 모자라면 띠 안에서 가로로 민다.
  // 상자는 늘 남긴다(국내 탭은 다가오는 일정이 상자에만 있다, `FE-REQ-050` FR-4).
  // ~~화면 폭 1379 이하에서만 줄이기~~ 2026-11-09 정정: 11-03 왼쪽 레일(72)이 생긴 뒤 1440 화면에서도 칸이 모자라 넓은 배치가 골라지고
  // 항목 오른쪽 열이 상자 밑에 잘렸다. 화면 폭이 아니라 칸 폭으로 판정한다(레일 · 사이드가 바뀌어도 맞다)
  gridTemplateColumns: `${FEATURED_WIDTH} minmax(0, max-content) minmax(${PANEL_MIN_WIDTH}, 1fr)`,
  height: STRIP_HEIGHT,
  "@media": {
    [MOBILE]: {
      gridTemplateColumns: "minmax(0, 1fr)",
      gridTemplateRows: `${FEATURED_HEIGHT_MOBILE} 56px`,
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
  "@media": {
    [MOBILE]: { height: FEATURED_HEIGHT_MOBILE },
  },
});

/** 작은 항목 — 세로로 3줄씩 채우고 다음 열로 넘어간다 */
export const itemGrid = style({
  ...divided,
  display: "grid",
  gridAutoFlow: "column",
  gridTemplateRows: "repeat(3, 56px)",
  gridAutoColumns: `minmax(${ITEM_COLUMN_MIN_WIDTH}, ${ITEM_COLUMN_WIDTH})`,
  rowGap: "4px",
  // 열 사이 8 — 칸이 줄어드는 폭(1280)에서 끝 열 등락률 괄호가 잘리던 몇 px(2026-11-09). 항목마다 왼쪽 여백이 이미 있다
  columnGap: vars.space.sm,
  minWidth: 0,
  // 칸이 모자랄 때만 실제로 밀린다(넓으면 넘칠 것이 없다)
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
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

/**
 * 오른쪽 상자 칸. 좁은 데스크톱에서도 남긴다(항목 열이 대신 밀린다) — 국내 탭은 일정이 여기에만 있다(`FE-REQ-050` FR-4).
 * 모바일(768 미만)은 웹 안내 화면이라 숨긴다
 */
export const panelCell = style({
  minWidth: 0,
  height: STRIP_HEIGHT,
  marginLeft: vars.space.lg,
  "@media": {
    [MOBILE]: { display: "none" },
  },
});
