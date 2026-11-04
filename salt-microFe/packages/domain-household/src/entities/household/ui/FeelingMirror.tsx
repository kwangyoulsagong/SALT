import { EMOTION_LABEL, FEELING_MESSAGES as F } from "../model/messages";
import type { EmotionMirror } from "../model/types";
import * as s from "./mirror.css";

/** 1~5점 건수 막대 — 길이는 그 줄 안의 가장 큰 건수 대비(표시 비율일 뿐, 계산 결과를 만들지 않는다) */
const Bars = ({ when, counts }: { when: string; counts: number[] }) => {
  const top = Math.max(1, ...counts);
  return (
    <div className={s.bars}>
      <span className={s.when}>{when}</span>
      {counts.map((n, i) => (
        <span key={i} className={s.barCell} title={F.mirrorBar(when, i + 1, n)} aria-label={F.mirrorBar(when, i + 1, n)}>
          <span className={s.bar} style={{ height: `${Math.round((n / top) * 100)}%` }} />
          <span className={s.score}>{i + 1}</span>
        </span>
      ))}
    </div>
  );
};

/**
 * 기분별 만족 거울(`FE-REQ-057` FR-8 · `SRV-REQ-046` FR-13) — 산 직후 · 다음 날 점수별 건수만. 평균 · 점수 · 좋다/나쁘다 0.
 * 색은 하나(회색) — 높은 점수에 다른 색을 주지 않는다.
 */
export const FeelingMirror = ({ mirror }: { mirror: EmotionMirror[] }) => (
  <section className={s.box} aria-label={F.mirrorTitle}>
    <h2 className={s.title}>{F.mirrorTitle}</h2>
    {mirror.length === 0 ? (
      <p className={s.note}>{F.mirrorEmpty}</p>
    ) : (
      <ul className={s.list}>
        {mirror.map((m) => (
          <li key={m.emotion} className={s.item}>
            <span className={s.head}>
              {EMOTION_LABEL[m.emotion]} · {F.mirrorCount(m.count)}
            </span>
            <Bars when={F.mirrorNow} counts={m.feltNow} />
            <Bars when={F.mirrorNext} counts={m.feltNext} />
          </li>
        ))}
      </ul>
    )}
    <p className={s.note}>{F.mirrorNote}</p>
  </section>
);
