import { kstClock } from "@repo/core/marketKr";
import type { MoveCause, MoveCauseView } from "@repo/core/whyMoved";
import { Badge } from "@repo/ui/badge";

import { WHY_MOVED_MESSAGES as M } from "../../model/whyMovedMessages";

import * as s from "./CauseFlow.css";
import { moveTone, signedText } from "./whyMovedFormat";

const toneOf = moveTone;
const signed = signedText;

/**
 * 원인 → 근거 → 결과(F017 v4 순서 1b · `FE-REQ-063` FR-9 · `ADR-009` v4) — **표시 전용**. 문장 · 단계 · 순서는 서버가 정했다.
 * 가장 앞 원인을 세 칸(원인 · 근거 · 결과)으로, 나머지는 "다른 가능성"으로 접는다. 단계를 정한 근거는 굵게(숨은 글자로도 말한다).
 * 출처는 번호가 아니라 이름 칩. ~~소식 원인이면 머리말이 아래 "같은 날 있었던 일" 줄로 잇는다~~ — 그 카드는 화면에서 뺐다(F017 v4 순서 6 · `FE-REQ-064` FR-12),
 * 한 장 패널 ② 줄 · 목록 미리보기 원인 칸이 이 흐름만 쓴다
 */
export const CauseFlow = ({ view }: { view: MoveCauseView }) => {
  const [first, ...others] = view.causes;
  if (!first) return null;
  return (
    <section aria-label={M.cause.headingSr}>
      <ol className={s.causeFlow}>
        <li className={s.causeStep}>
          <span className={s.causeStepLabel}>{M.cause.steps.cause}</span>
          <CauseHead cause={first} />
        </li>
        {first.evidence.length > 0 && (
          <li className={s.causeStep}>
            <span className={s.causeStepLabel}>{M.cause.steps.evidence}</span>
            <EvidenceList cause={first} />
          </li>
        )}
        <li className={s.causeStep}>
          <span className={s.causeStepLabel}>{M.cause.steps.result}</span>
          <p className={s.causeHeadline}>
            {/* 아래 "오늘 등락 나눠 보기" 줄과 같은 숫자 · 같은 자릿수(같은 숫자를 두 모양으로 보이지 않는다) */}
            <span className={s.value[toneOf(view.result.changeRate)]}>{M.today(signed(view.result.changeRate, "%"))}</span>
          </p>
          {view.result.past && <p className={s.causeNote}>{view.result.past}</p>}
        </li>
      </ol>
      {others.length > 0 && (
        <details className={s.otherCauses}>
          <summary className={s.otherSummary}>
            {M.cause.others} {others.length}
          </summary>
          <ul className={s.causeFlow}>
            {others.map((c) => (
              <li key={`${c.kind}:${c.headline}`} className={s.causeStep}>
                <CauseHead cause={c} />
                <EvidenceList cause={c} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

const CauseHead = ({ cause }: { cause: MoveCause }) => (
  <>
    <p className={s.causeHeadline}>
      {cause.strength !== "none" && (
        <Badge size="sm" tone={cause.strength === "likely" ? "brand" : "neutral"}>
          {M.cause.strength[cause.strength]}
        </Badge>
      )}{" "}
      {cause.headline}
    </p>
    {cause.note && <p className={s.causeNote}>{cause.note}</p>}
  </>
);

const EvidenceList = ({ cause }: { cause: MoveCause }) => (
  <ul className={s.evidenceList}>
    {cause.evidence.map((e) => (
      <li key={`${e.kind}:${e.value}`}>
        <p className={s.evidenceLine}>
          <span className={s.evidenceValue[e.supports ? "strong" : "plain"]}>{e.value}</span>
          {e.supports && <span className={s.srOnly}> ({M.cause.supportsSr})</span>}
          {e.compare && ` · ${e.compare}`}
          <span className={s.sourceChip}>
            {e.source}
            {e.at && ` ${kstClock(e.at)}`}
          </span>
        </p>
        {e.gloss && <p className={s.gloss}>{e.gloss}</p>}
      </li>
    ))}
  </ul>
);

