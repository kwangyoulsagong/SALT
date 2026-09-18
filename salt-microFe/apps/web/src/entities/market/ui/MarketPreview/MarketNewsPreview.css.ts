import { style } from "@vanilla-extract/css";

/**
 * 제목 링크는 **원래 제목과 똑같이 보여야 한다.**
 *
 * 원문 카드의 제목은 평범한 `Heading` 이었다. 원문으로 가는 링크를 붙이면서(FR-44)
 * 앵커 기본 스타일(파란 글자 + 밑줄)이 그대로 나오면 카드가 다른 화면처럼 보인다.
 * 색과 밑줄을 물려받게 두고, 가리켰을 때만 밑줄로 링크임을 알린다.
 */
export const newsTitleLink = style({
  color: "inherit",
  textDecoration: "none",

  /**
   * **`block` 이어야 제목이 잘린다.**
   *
   * `Heading lineClamp={1}` 은 `width: 100%` + `ellipsis` 로 자른다. 앵커가 기본값
   * (`inline`)이면 그 폭이 내용 길이로 정해지고, 100% 가 "내용 폭"이 되어 **아무것도
   * 잘리지 않는다.** 실기사 제목은 상수보다 훨씬 길어서 패널 밖으로 흘렀다.
   */
  display: "block",
  minWidth: 0,
  overflow: "hidden",

  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});

/**
 * 요약 두 줄 고정.
 *
 * 원문은 상수 한 문장이라 두 줄에 들어맞았다. 실기사 요약은 길이가 제각각이라
 * 묶어 두지 않으면 **카드 높이가 기사마다 달라지고** 그 아래 블록이 밀린다.
 */
export const newsSummary = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});
