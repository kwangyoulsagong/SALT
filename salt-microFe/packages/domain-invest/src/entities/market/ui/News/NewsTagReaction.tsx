import type { NewsReaction, NewsTag } from "@repo/core/newsTag";

import { ratePct, signedPct } from "../../lib/newsTag";
import { NEWS_MESSAGES as M } from "../../model/newsMessages";

import { NewsTagChips } from "./NewsTagChips";
import * as s from "./News.css";

const ReactionLine = ({ r }: { r: NewsReaction }) => (
  <li className={s.tagLine}>
    <span className={s.tagLineHead}>{M.tag.day(r.days)}</span>
    {r.upRate !== null && r.mean !== null ? (
      <span>
        {M.tag.mean(signedPct(r.mean))} · {M.tag.upRate(ratePct(r.upRate), r.baseUpRate !== null ? ratePct(r.baseUpRate) : "—")}
      </span>
    ) : (
      <span>{M.tag.belowMin}</span>
    )}
  </li>
);

/**
 * 모달 "같은 종류 과거 반응"(F017 단계 6) — 칩 + 숫자 한 줄씩. 숫자는 서버 값 그대로(퍼센트 표기만).
 * 과거 기록이라는 것 · 시장 몫을 뺐다는 것을 한 줄로 — 앞날 문장 0
 */
export const NewsTagReaction = ({ tag }: { tag: NewsTag }) => (
  <section className={s.tagBlock} aria-label={M.tag.heading}>
    <h3 className={s.sectionTitle}>{M.tag.heading}</h3>
    <NewsTagChips tag={tag} />
    <ul className={s.tagLines}>
      <li className={s.tagLine}>{M.tag.sample(tag.reaction.sample)}</li>
      <ReactionLine r={tag.reaction} />
      {tag.reaction5d && <ReactionLine r={tag.reaction5d} />}
      {tag.preMove5d !== null && <li className={s.tagLine}>{M.tag.preMoveLine(signedPct(tag.preMove5d))}</li>}
    </ul>
    <p className={s.note}>{M.tag.note}</p>
  </section>
);
