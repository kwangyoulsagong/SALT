import { Badge } from "@repo/ui/badge";

import { CHALLENGE_MESSAGES as C, formatWon } from "../model/messages";
import type { Challenge } from "../model/types";
import * as s from "./challenge.css";

/**
 * 챌린지 머리(`FE-REQ-057` FR-9 · 가계부 S1d) — 이름 · 기간 · 단계 · 한 날 수 · 아낀 돈 합. 숫자는 전부 서버 값(더하기 0).
 * **실패 · 연속 · 달성률을 보이지 않는다.** 단계 배지는 같은 색 하나(끝난 것을 다른 색으로 가르지 않는다).
 */
export const ChallengeHead = ({ challenge }: { challenge: Challenge }) => (
  <div className={s.head}>
    <div className={s.titleRow}>
      <h3 className={s.title}>{challenge.title}</h3>
      <Badge>{C.phase[challenge.phase]}</Badge>
    </div>
    <p className={s.meta}>
      {C.period(challenge.startsOn, challenge.endsOn)}
      {challenge.endedOn ? ` · ${C.endedOn(challenge.endedOn)}` : ""}
    </p>
    <p className={s.numbers}>
      <span>{C.days(challenge.days.length)}</span>
      <span>{C.saved(formatWon(challenge.savedTotal))}</span>
      {challenge.contributedTotal > 0 ? <span>{C.contributed(formatWon(challenge.contributedTotal))}</span> : null}
    </p>
  </div>
);
