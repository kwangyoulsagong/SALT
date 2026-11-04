import { CATEGORY_LABEL, FIXED_COST_MESSAGES as M, formatDay, formatWon } from "../model/messages";
import type { HouseholdFixedCost } from "../model/types";
import * as s from "./expense.css";

/**
 * 고정비 후보 한 줄(가계부 S1e) — 가맹점 · 분류 · 몇 번 · 지난 금액 · 다음 날짜 · 올랐으면 얼마. 전부 서버 값, 표시만.
 * 오른 줄도 같은 색 — 경고 색 · 아이콘 0(색만으로 뜻을 전하지 않는다: 문장이 뜻)
 */
export const FixedCostHead = ({ cost }: { cost: HouseholdFixedCost }) => (
  <div className={s.itemMain}>
    <span className={s.itemTitle}>
      {cost.merchant} · {CATEGORY_LABEL[cost.category]}
    </span>
    <span className={s.note}>{M.line(cost.count, formatWon(cost.lastAmount), formatDay(cost.nextOn))}</span>
    {cost.increase !== null ? <span className={s.note}>{M.increased(formatWon(cost.previousAmount), formatWon(cost.increase))}</span> : null}
  </div>
);
