"use client";

import { BOARD_MESSAGES as B, formatWon } from "../model/messages";
import type { HouseholdMonth } from "../model/types";
import { useCategoryLabel } from "./CategoryNames";
import * as s from "./board.css";

/** 색 단계 — 큰 분류 넷은 저마다, 다섯째부터는 같은 옅은 회색 */
const tone = (i: number) => Math.min(i, 4) as 0 | 1 | 2 | 3 | 4;

/**
 * 분류별로 쓴 돈(`FE-REQ-060` FR-4) — 가로 막대 하나 + 범례(도넛 대신 — 사이드 312 에서 공간 대비 정보가 적다).
 * 금액은 서버 행(`byCategory`) 그대로 — 묶어 더하지 않는다(금액은 서버만). 막대 길이 비율만 화면, 퍼센트 글자 0
 */
export const CategoryRatio = ({ byCategory }: { byCategory: HouseholdMonth["byCategory"] }) => {
  const label = useCategoryLabel();
  const rows = byCategory.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  if (rows.length === 0) return <p className={s.note}>{B.ratioEmpty}</p>;
  const scale = rows.reduce((max, c) => max + c.spent, 0); // 막대 길이 기준(표시 기하) — 화면에 글자로 내지 않는다
  return (
    <div>
      <div className={s.ratioBar} aria-hidden>
        {rows.map((c, i) => (
          <span key={c.key} className={s.ratioPart[tone(i)]} style={{ width: `${(c.spent / scale) * 100}%` }} />
        ))}
      </div>
      <ul className={s.legend} aria-label={B.ratioTitle}>
        {rows.map((c, i) => (
          <li key={c.key} className={s.legendRow}>
            <span className={s.swatch[tone(i)]} aria-hidden />
            <span className={s.legendName}>{label.category(c.key)}</span>
            <span className={s.legendValue}>{formatWon(c.spent)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
