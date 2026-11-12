import type { NewsTag } from "@repo/core/newsTag";

import { signedPct, tagLabelText } from "../../lib/newsTag";
import { NEWS_MESSAGES as M } from "../../model/newsMessages";

import * as s from "./News.css";

/**
 * 측정 태그 칩(F017 단계 6 · `FE-REQ-064` FR-5) — `[사건 종류] [보통 올랐던 · 보통 내렸던 · 엇갈림 · n건뿐] [선반영 ±n%]`.
 * 색은 쓰지 않는다 — 방향 색(빨강 · 파랑)이 붙으면 측정이 신호처럼 읽힌다. 글자가 뜻을 다 말한다. 숫자 펼침은 모달
 */
export const NewsTagChips = ({ tag }: { tag: NewsTag }) => {
  const label = tagLabelText(tag);
  return (
    <span className={s.tagChips} role="group" aria-label={M.tag.groupLabel(tag.eventKindText, label)}>
      <span className={s.tagChip}>{tag.eventKindText}</span>
      <span className={s.tagChip}>{label}</span>
      {tag.preMove5d !== null && <span className={s.tagChip}>{M.tag.preMove(signedPct(tag.preMove5d))}</span>}
    </span>
  );
};
