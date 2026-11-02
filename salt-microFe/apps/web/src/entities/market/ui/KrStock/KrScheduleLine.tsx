import { EVENT_KIND_LABELS } from "@repo/core/coach";
import type { KrScheduleItem } from "@repo/core/marketKr";

import { KR_STOCK_MESSAGES } from "../../model";
import * as s from "./KrScheduleLine.css";

const M = KR_STOCK_MESSAGES.schedule;
const dateParts = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});
/** "11.03(화)" — 서울 날짜. `Intl` 기본 모양("11. 03. (화)")은 띄어쓰기가 많아 한 줄에 셋이 안 들어간다 */
const formatDate = (iso: string) => {
  const parts = Object.fromEntries(dateParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month}.${parts.day}(${parts.weekday})`;
};

/**
 * 다가오는 국내 시장 일정 한 줄 — 표시 전용(F008 슬라이스 24, `FE-REQ-046` FR-5).
 *
 * 날짜 · 종류 · 남은 날만 그린다. 남은 날은 서버가 KST 달력으로 센 값(`daysUntil`) 그대로 — 화면이 다시 세지 않는다.
 * 몇 건을 받을지 · 어떤 종류인지는 서버가 정했다. 여기서는 받은 것 중 앞에서부터 `limit` 건만
 */
export const KrScheduleLine = ({ items, limit }: { items: KrScheduleItem[]; limit: number }) => (
  <section className={s.line} aria-label={M.regionLabel}>
    <span className={s.label}>{M.label}</span>
    <ul className={s.items}>
      {items.slice(0, limit).map((item) => (
        <li key={`${item.kind}-${item.eventAt}`} className={s.item}>
          <span className={s.dday}>{M.dday(item.daysUntil)}</span>
          <span className={s.date}>{formatDate(item.eventAt)}</span>
          <span>{EVENT_KIND_LABELS[item.kind]}</span>
        </li>
      ))}
    </ul>
  </section>
);

export const KrScheduleLinePlaceholder = () => <div className={s.placeholder} aria-hidden="true" />;
