import { globalStyle, style } from "@vanilla-extract/css";

/** 프리뷰가 접히는 폭. `FE-REQ-010` FR-52 의 768px 이다. */
const MOBILE_MAX_WIDTH = "767px";
const MOBILE = `screen and (max-width: ${MOBILE_MAX_WIDTH})`;
const DESKTOP = "screen and (min-width: 768px)";

/**
 * 페이지를 끝까지 내렸을 때 2컬럼 상자 위아래에 남는 높이 (`FE-REQ-010` FR-53).
 *
 * 위 60px = 필터 줄 · 간격(≈45) + 숨 쉴 틈 16, 아래 80px = 섹션 · 페이지 여백.
 *
 * **2026-09-22 개정 — 페이지 세로 스크롤을 허용한다(사용자 결정).** 전에는 395px(= 위
 * 프로필 헤더 · 제목 · 탭 · 필터 315 + 아래 80)을 빼서 페이지가 스크롤되지 않았는데,
 * 900px 화면에서 표 · 프리뷰가 505px 에 갇혀 표가 8줄, 프리뷰는 차트 아래가 잘렸다.
 * 이제 헤더 · 제목 · 탭은 스크롤로 밀려 올라가고, 끝까지 내리면 필터 줄부터 아래 여백까지가
 * 한 화면에 들어온다(900px 화면 상자 760px).
 */
const BOARD_CHROME_HEIGHT = "140px";

/**
 * 이 아래로는 표가 너무 짧아져 한 화면에 몇 줄 안 보인다. 그때는 페이지 스크롤을 허용한다.
 */
const BOARD_MIN_HEIGHT = "320px";

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
    /**
     * **PC 에서는 이 상자가 화면 높이 기준으로 정해지고, 표와 프리뷰가 그 안에서 각자
     * 스크롤한다**(FR-53). 페이지는 헤더 높이만큼 스크롤된다(2026-09-22). 그 전에는 표 `80vh` · 프리뷰 `800px` 이 각자 높이를 정해서 900px 화면에서
     * 문서가 1195px 이 됐다 — 표 스크롤과 페이지 스크롤이 겹쳤다.
     */
    [DESKTOP]: {
      height: `max(${BOARD_MIN_HEIGHT}, calc(100dvh - ${BOARD_CHROME_HEIGHT}))`,
      alignItems: "stretch",
    },
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

/**
 * PC 에서 두 열의 고정 높이를 **열 높이로 바꾼다** (FR-53).
 *
 * 표 `ScrollTableContainer maxHeight="viewport"`(80vh), 프리뷰 패널 `minHeight: 800px` ·
 * 안쪽 `ScrollContainer maxHeight="2xl"`(800px) 은 디자인 시스템 · entity 의 값이라 거기서
 * 고치지 않는다. 클래스를 두 번 겹쳐(`.a.a`) 명시도로 이긴다 — 소스 순서에 기대지 않는다.
 *
 * 프리뷰 높이가 여전히 **고정**이라(열 높이 = 화면 기준) hover 로 내용이 바뀌어도 페이지가
 * 출렁이지 않는다 — `MarketPreview.css.ts` 의 `minHeight` 가 막던 문제가 그대로 막힌다.
 */
globalStyle(`${tablePane}${tablePane} > *`, {
  "@media": {
    [DESKTOP]: { maxHeight: "100%" },
  },
});

globalStyle(`${previewPane}${previewPane} > *`, {
  "@media": {
    [DESKTOP]: { minHeight: 0, height: "100%" },
  },
});

globalStyle(`${previewPane}${previewPane} > * > *`, {
  "@media": {
    [DESKTOP]: { maxHeight: "100%" },
  },
});
