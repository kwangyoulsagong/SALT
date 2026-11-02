import { style } from "@vanilla-extract/css";

/**
 * 차트 폭을 재는 상자. **폭이 부모에 묶여 있어야 한다.**
 *
 * 이 상자는 세로 FlexBox(`align-items: flex-start`) 의 자식이라 기본적으로 폭이
 * 내용 폭 = 차트 폭이 된다. 그러면 차트 폭을 재서 차트에 넘기는 일이 제자리를 돈다 —
 * 처음 447px 이 그대로 측정돼 좁은 프리뷰에서 120px 넘게 튀어나왔다(2026-09-21 실측).
 */
export const chartMeasure = style({
  width: "100%",
  minWidth: 0,
  /**
   * 프리뷰가 줄어든 프레임과 다시 잰 프레임 사이에 차트가 몇 px 넘친다(1280px 에서
   * 2px). 그 한 프레임에 프리뷰 가로 스크롤바가 깜박이지 않게 여기서 자른다.
   */
  overflow: "hidden",
});
