import { labelOr } from "@repo/web-shared/lib";

import { formatWon, GOAL_MESSAGES } from "../model/messages";
import type { SavingsTodayMoney } from "../model/types";
import * as s from "./goal.css";

/** 물가 변화율 표시 — 서버가 소수 한 자리로 준 값의 부호만 붙인다(계산 0) */
const signed = (value: number | string): string => {
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${String(value)}%`;
};

/**
 * 오늘 돈(`FE-REQ-056` FR-7 · FEATURE-012 FR-9) — 목표를 정한 때 물가와 지금 물가로 같은 금액의 값어치를 다시 본다.
 * 숫자 · 기준 달은 서버(`SRV-REQ-045` FR-10). 금액을 고치라고 하지 않는다 — 고칠지는 사용자가 정한다는 사실만.
 * 숫자가 없으면 이유 한 줄(6개월 전 · 새 물가 없음 · 못 읽음).
 */
export interface TodayMoneyBoxProps {
  money: SavingsTodayMoney;
  targetAmount: number;
  /** 제목이 있는 패널 안(상세 회고 탭) — 상자 · 제목 없이 */
  bare?: boolean;
}

export const TodayMoneyBox = ({ money, targetAmount, bare = false }: TodayMoneyBoxProps) => {
  const M = GOAL_MESSAGES.todayMoney;
  const ready = money.reason === null && money.baseMonth && money.latestMonth && money.worthToday !== null && money.sameValue !== null;
  return (
    <div className={bare ? s.bare : s.box} aria-label={M.title}>
      {bare ? null : <span className={s.label}>{M.title}</span>}
      {ready ? (
        <>
          <span className={s.value}>
            {M.worth(money.baseMonth!, formatWon(targetAmount), money.latestMonth!, formatWon(money.worthToday!))}
          </span>
          {money.changePercent !== null ? (
            <span className={s.label}>{M.same(formatWon(money.sameValue!), signed(money.changePercent))}</span>
          ) : null}
          <span className={s.label}>{M.choice}</span>
          <span className={s.label}>{M.source(money.indexBase)}</span>
        </>
      ) : (
        <span className={s.label}>{labelOr(M.reason, money.reason ?? "unavailable", "")}</span>
      )}
    </div>
  );
};
