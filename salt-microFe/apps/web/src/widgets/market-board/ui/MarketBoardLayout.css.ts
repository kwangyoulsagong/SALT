import { globalStyle, style } from "@vanilla-extract/css";

/** 프리뷰가 접히는 폭. `FE-REQ-010` FR-52 의 768px 이다. */
const MOBILE_MAX_WIDTH = "767px";
const MOBILE = `screen and (max-width: ${MOBILE_MAX_WIDTH})`;

/**
 * 프리뷰가 PC 에서 줄어들 수 있는 하한. 이 아래로는 표가 자체 스크롤한다.
 *
 * 1280px 화면(부모 1200px)에서 표 전체(≈845px)와 gap 32px 이 들어가는 값이다.
 * 360px 이면 거래대금 컬럼이 34px 잘렸다(2026-09-21 실측).
 */
const PREVIEW_MIN_WIDTH = "320px";

/**
 * 표 + 우측 프리뷰 2컬럼.
 *
 * **PC 배치는 그대로다** (FR-50 · 변경 금지 목록). 좁은 화면에서만 세로로 쌓는다 —
 * **숨기지 않는다**(FR-52). 프리뷰는 표 아래로 내려간다.
 */
export const splitLayout = style({
  /**
   * **이 상자는 PC 에서도 부모 폭에 맞춘다.**
   *
   * 바깥 열이 `align-items: flex-start` 라 이 상자의 폭은 **내용 폭**(표 max-content
   * + gap + 프리뷰 500)으로 정해졌다. 1280px 화면에서 부모 1200px 을 1326~1380px 로
   * 밀고 나가 `body` 가 가로로 스크롤됐고, 표 max-content 가 hover 한 종목에 따라
   * 몇 px 씩 달라서 **프리뷰가 좌우로 흔들렸다**(2026-09-21 실측). 이전에는 이 두 줄이
   * 모바일 미디어쿼리 안에만 있었다.
   */
  width: "100%",
  minWidth: 0,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      /**
       * **`stretch` 가 없으면 표가 화면 폭을 못 받는다.**
       *
       * 이 열의 정렬은 `start` 다(FlexBox 기본값). 세로로 쌓이면 자식 폭이 내용 폭으로
       * 정해지고, 표는 그 폭이 컬럼 5개 합(675px)이라 375px 화면을 밀어낸다 —
       * 표만 자체 스크롤해야 하는데(FR-51) 페이지가 같이 밀렸다.
       */
      alignItems: "stretch",
    },
  },
});

/**
 * 표 열. 기준 폭이 **표의 max-content** 다.
 *
 * `ScrollTableContainer` 는 `width: 100%` 라 flex 기준 폭이 부모 전체가 된다 —
 * 그러면 표와 프리뷰가 비율로 나눠 줄어 공간이 남아도 표가 잘린다. 감싸는 열이
 * 내용 폭을 기준으로 삼고, 모자라면 `minWidth: 0` 으로 줄어 표만 스크롤한다(FR-51).
 */
export const tablePane = style({
  flex: "1 1 auto",
  minWidth: 0,
  "@media": {
    [MOBILE]: {
      flex: "none",
    },
  },
});

/**
 * 프리뷰 열. **공간이 모자라면 먼저 줄어든다.**
 *
 * 표 max-content(≈850px) + 프리뷰 500px 이 1440px 화면에도 약간 모자란다. 비율로
 * 나누면 표가 오른쪽 몇십 px 이 잘리고 스크롤바가 숨겨져 있어(`hideScrollbar`)
 * 잘린 줄도 모른다. 줄어드는 몫을 프리뷰가 먼저 가져가고(`flex-shrink` 가 크다),
 * `PREVIEW_MIN_WIDTH` 에 닿은 뒤에야 표가 줄어든다. 넓은 화면에서는 500px 그대로다.
 */
export const previewPane = style({
  flex: `0 1000 500px`,
  minWidth: PREVIEW_MIN_WIDTH,
  "@media": {
    [MOBILE]: {
      flex: "none",
      minWidth: 0,
    },
  },
});

/**
 * 패널 자체의 고정 폭(`Root width="lg"` = 500px)을 열 폭에 맞춘다.
 * 두 클래스를 겹쳐 명시도로 이긴다 — 파일이 다른 두 스타일의 소스 순서에 기대지 않는다.
 */
globalStyle(`${previewPane} > *`, {
  width: "100%",
});
