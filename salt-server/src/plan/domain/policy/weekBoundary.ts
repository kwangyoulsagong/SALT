/**
 * 주 경계(`SRV-REQ-020` FR-30 · 31) — `weekOf` = 그 주의 **KST 월요일** 날짜(`YYYY-MM-DD`).
 * 일요일 23:59 KST 는 그 주, 월요일 00:00 KST 는 다음 주. 날짜 산술은 UTC 자정 기준 정수 일이라 서버 tz 와 무관하다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const toUtcMidnight = (isoDate: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`날짜 형식이 아니다: ${isoDate}`);
  return Date.parse(`${isoDate}T00:00:00Z`);
};
const fromUtcMidnight = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** KST 달력 날짜 */
export const kstDate = (now: Date): string => fromUtcMidnight(Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS) * DAY_MS);

export const addDays = (isoDate: string, days: number): string => fromUtcMidnight(toUtcMidnight(isoDate) + days * DAY_MS);

/** 그 날짜가 속한 주의 월요일 */
export const mondayOf = (isoDate: string): string => {
  const ms = toUtcMidnight(isoDate);
  const isoDow = ((new Date(ms).getUTCDay() + 6) % 7) + 1; // 월 1 … 일 7
  return fromUtcMidnight(ms - (isoDow - 1) * DAY_MS);
};

/** 지금(KST)이 속한 주의 월요일 */
export const weekOfKst = (now: Date): string => mondayOf(kstDate(now));

export const addWeeks = (weekOf: string, weeks: number): string => addDays(weekOf, weeks * 7);

export const isMonday = (isoDate: string): boolean => mondayOf(isoDate) === isoDate;

/** from 이상 to 미만의 월요일들(둘 다 월요일) */
export const weeksBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let w = from; w < to; w = addWeeks(w, 1)) out.push(w);
  return out;
};

/** `YYYY-MM` */
export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

/** 그 달의 첫날 · 마지막 날 */
export const monthRange = (month: string): { first: string; last: string } => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`달 형식이 아니다: ${month}`);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = fromUtcMidnight(Date.UTC(y, m, 1) - DAY_MS);
  return { first, last };
};

/** 그 달에 속한 월요일(귀속 달 = 월요일의 달 — `DB-REQ-013` FR-16) */
export const mondaysInMonth = (month: string): string[] => {
  const { first, last } = monthRange(month);
  const firstMonday = mondayOf(first) < first ? addWeeks(mondayOf(first), 1) : first;
  return weeksBetween(firstMonday, addDays(last, 1));
};

/** 두 날짜 사이 일수(b − a) */
export const daysBetween = (a: string, b: string): number => Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / DAY_MS);
