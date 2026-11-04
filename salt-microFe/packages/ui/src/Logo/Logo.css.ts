import { style } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

const c = vars.colors.brand.mark;

/** 물방울 색 — 값은 `tokens.colors.brand.mark`(은회색) 한 곳(FE-REQ-051 FR-4). SVG 에 hex 를 두지 않는다 */
export const mark = {
  // 단색 — 밝은 바탕은 진한 은회색(`flat`), 어두운 바탕은 흰색. 선(물결)에도 같은 클래스를 쓴다(stroke)
  flatLight: style({ fill: c.flat, stroke: c.flat }),
  flatDark: style({ fill: vars.colors.text.white, stroke: vars.colors.text.white }),
  noFill: style({ fill: "none" }),
  // 입체 — 그라데이션 끝 색과 빛 · 그늘 번짐
  stopLight: style({ stopColor: c.light }),
  stopMid: style({ stopColor: c.mid }),
  stopDeep: style({ stopColor: c.deep }),
  stopShadow: style({ stopColor: c.shadow }),
  fillHi: style({ fill: c.hi }),
  fillShadow: style({ fill: c.shadow }),
  fillDeep: style({ fill: c.deep }),
  strokeHi: style({ stroke: c.hi }),
};

/** 글자 — 밝은 바탕은 1단 글자색, 어두운 바탕은 흰색 */
export const wordmark = {
  light: style({ fill: vars.colors.text.primary }),
  dark: style({ fill: vars.colors.text.white }),
};

export const root = style({ display: "block", flexShrink: 0 });
