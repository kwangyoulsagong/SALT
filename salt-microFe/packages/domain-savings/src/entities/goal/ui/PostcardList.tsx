import { GOAL_MESSAGES, templateTag } from "../model/messages";
import type { SavingsGoal } from "../model/types";
import * as s from "./goal.css";

/** 엽서 보관함(`FE-REQ-056` FR-10) — 다 찬 목표의 기록 한 장씩(걸린 일수 · 적립 횟수, 서버 값). 사진은 파일 저장소가 정해지면 */
export interface PostcardListProps {
  goals: SavingsGoal[];
  /** 제목을 감싼 쪽이 이미 그릴 때(사이드 접힘 머리 — `FE-REQ-060` FR-8) false */
  titled?: boolean;
}

export const PostcardList = ({ goals, titled = true }: PostcardListProps) => {
  const cards = goals.filter((g) => g.postcard !== null);
  return (
    <section aria-label={GOAL_MESSAGES.postcard.title}>
      {titled ? <h2 className={s.title}>{GOAL_MESSAGES.postcard.title}</h2> : null}
      {cards.length === 0 ? (
        <span className={s.label}>{GOAL_MESSAGES.postcard.empty}</span>
      ) : (
        <ul className={s.postcards}>
          {cards.map((g) => (
            <li key={g.id} className={s.postcard}>
              <div className={s.row}>
                <span className={s.value}>{g.title}</span>
                {templateTag(g) ? <span className={s.label}>{templateTag(g)}</span> : null}
              </div>
              <span className={s.label}>{GOAL_MESSAGES.postcard.period(g.postcard!.startedOn, g.postcard!.reachedOn)}</span>
              <span className={s.value}>{GOAL_MESSAGES.postcard.line(g.postcard!.daysTaken, g.postcard!.depositCount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
