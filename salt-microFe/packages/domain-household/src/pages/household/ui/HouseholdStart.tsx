import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";

import { HOUSEHOLD_PAGE as M } from "../model";
import * as s from "./household.css";

/** 예시 막대 높이(%) — 모양만(숫자 · 날짜 0). 회색 · "예시" 표지 */
const SAMPLE = [22, 48, 0, 35, 64, 18, 0, 52, 30, 76, 12, 40, 58, 0, 26, 44, 70, 16, 38, 0, 54];

/**
 * 지출이 없는 달(2026-11-20 가계부 개편) — 이번 달이면 첫 기록 안내 + 행동 둘 + 만든 뒤 모양 예시, 지난 달이면 한 줄.
 * 바로 적기 폼은 오른쪽 칸에 있다 — 여기선 전체 적기 화면 · 예산으로 가는 링크
 */
export const HouseholdStart = ({ current }: { current: boolean }) => {
  if (!current) return <p className={s.emptyLine}>{M.start.pastTitle}</p>;
  return (
    <section className={s.startCard} aria-labelledby="hh-start">
      <div className={s.startText}>
        <h2 id="hh-start" className={s.startTitle}>
          {M.start.title}
        </h2>
        <p className={s.hint}>{M.start.description}</p>
        <div className={s.startActions}>
          <Link href={ROUTES.newExpense} className={s.primaryLink}>
            {M.start.add}
          </Link>
          <Link href={ROUTES.householdBudget} className={s.weakLink}>
            {M.start.budget}
          </Link>
        </div>
      </div>
      <div className={s.sample} aria-hidden="true">
        <div className={s.sampleHead}>
          <span className={s.hint}>{M.start.sampleTitle}</span>
          <span className={s.sampleBadge}>{M.start.sample}</span>
        </div>
        <div className={s.sampleBars}>
          {SAMPLE.map((h, i) => (
            <span key={i} className={h === 0 ? s.sampleDot : s.sampleBar} style={h === 0 ? undefined : { height: `${h}%` }} />
          ))}
        </div>
      </div>
    </section>
  );
};
