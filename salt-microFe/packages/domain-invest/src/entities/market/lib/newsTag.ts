import type { NewsTag } from "@repo/core/newsTag";

import { NEWS_MESSAGES as M } from "../model/newsMessages";

const MINUS = "−";

/** 단순 비율 → 부호 있는 퍼센트 한 자리(0.0312 → "+3.1%", 0 → "0.0%") */
export const signedPct = (v: number): string => {
  const a = Math.abs(v * 100).toFixed(1);
  return `${Number(a) === 0 ? "" : v > 0 ? "+" : MINUS}${a}%`;
};

/** 0~1 비율 → 정수 퍼센트("55%") */
export const ratePct = (v: number): string => `${Math.round(v * 100)}%`;

/** 칩 라벨 문구 — 표본 미달이면 "같은 종류 n건뿐" */
export const tagLabelText = (tag: NewsTag): string =>
  tag.label === "few" ? M.tag.few(tag.reaction.sample) : M.tag.label[tag.label];
