import { style } from "@vanilla-extract/css";

/** 프리뷰가 접히는 폭. `FE-REQ-010` FR-52 의 768px 이다. */
const MOBILE_MAX_WIDTH = "767px";

/**
 * 표 + 우측 프리뷰 2컬럼.
 *
 * **PC 배치는 그대로다** (FR-50 · 변경 금지 목록). 좁은 화면에서만 세로로 쌓는다 —
 * **숨기지 않는다**(FR-52). 프리뷰는 표 아래로 내려간다.
 */
export const splitLayout = style({
  "@media": {
    [`screen and (max-width: ${MOBILE_MAX_WIDTH})`]: {
      flexDirection: "column",
      /**
       * **`stretch` 가 없으면 표가 화면 폭을 못 받는다.**
       *
       * 이 열의 정렬은 `start` 다(FlexBox 기본값). 세로로 쌓이면 자식 폭이 내용 폭으로
       * 정해지고, 표는 그 폭이 컬럼 5개 합(675px)이라 375px 화면을 밀어낸다 —
       * 표만 자체 스크롤해야 하는데(FR-51) 페이지가 같이 밀렸다.
       */
      alignItems: "stretch",
      /**
       * 이 열 자체도 부모 폭에 맞춘다.
       *
       * 바깥 열이 `align-items: flex-start` 라(기존 배치다) 이 컨테이너가 **내용 폭**
       * 으로 정해진다 — 내용이 표라서 675px 이고, 그 순간 화면이 밀린다. 안쪽만
       * 고쳐서는 소용이 없고 이 상자가 먼저 화면 폭 안에 들어와야 한다.
       */
      width: "100%",
      minWidth: 0,
    },
  },
});
