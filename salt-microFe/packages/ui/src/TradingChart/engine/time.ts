/**
 * 시각 → 달력 값. **브라우저 시간대를 쓰지 않는다** — `offsetMinutes` 만큼 옮긴 뒤 UTC 로 읽는다
 * (`FE-REQ-034` FR-61 · 뉴욕 브라우저에서도 봉 시각이 같다).
 */
export interface CalendarParts {
  year: number;
  month: number; // 1~12
  day: number;
  hour: number;
  minute: number;
}

const MINUTE_MS = 60_000;

export const calendarParts = (time: number, offsetMinutes: number): CalendarParts => {
  const d = new Date(time + offsetMinutes * MINUTE_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 범례 · 십자선 배지용 전체 시각 */
export const formatFullTime = (time: number, offsetMinutes: number, intraday: boolean): string => {
  const p = calendarParts(time, offsetMinutes);
  const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  return intraday ? `${date} ${pad(p.hour)}:${pad(p.minute)}` : date;
};

/** 최고 · 최저 표시용 짧은 날짜 `26.06.23` */
export const formatShortDate = (time: number, offsetMinutes: number): string => {
  const p = calendarParts(time, offsetMinutes);
  return `${pad(p.year % 100)}.${pad(p.month)}.${pad(p.day)}`;
};

export interface TimeTick {
  index: number;
  label: string;
  /** 연도 · 날짜가 바뀌는 큰 경계. 굵게 그린다 */
  major: boolean;
}

export interface TimeTickLabels {
  year: (year: number) => string;
  month: (month: number) => string;
  day: (month: number, day: number) => string;
  time: (hour: number, minute: number) => string;
}

/** 분봉 라벨 간격 후보(분) */
const INTRADAY_STEPS = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720];
/** 일봉 — 날 간격 후보(월 경계로 부족할 때) */
const DAY_STEPS = [1, 2, 5, 10, 15];

/**
 * 시간축 눈금 (`FE-REQ-034` FR-5). 경계에서 끊고, 라벨 사이는 `minGapPx` 이상.
 *
 * - 일봉: 월이 바뀌는 봉(해가 바뀌면 연도). 월이 너무 드물면(확대) 날 간격을 더한다
 * - 분봉: 날이 바뀌는 봉(날짜) + 시각 간격(봉 폭에 맞춰 고른다)
 *
 * 먼저 큰 경계를 넣고, 남은 자리에만 작은 라벨을 넣는다 — 연도 · 날짜가 작은 라벨에 밀려 빠지지 않는다.
 */
export const buildTimeTicks = (
  times: ArrayLike<number>,
  from: number,
  to: number,
  barSpacing: number,
  intraday: boolean,
  offsetMinutes: number,
  minGapPx: number,
  labels: TimeTickLabels,
): TimeTick[] => {
  if (to < from) return [];
  const minBars = Math.max(1, Math.ceil(minGapPx / barSpacing));
  const candidates: Array<TimeTick & { rank: number }> = [];

  let stepMinutes = INTRADAY_STEPS[INTRADAY_STEPS.length - 1]!;
  if (intraday && to > from) {
    const barMinutes = Math.max(1, Math.round((times[to]! - times[from]!) / (to - from) / MINUTE_MS));
    stepMinutes =
      INTRADAY_STEPS.find((s) => s >= barMinutes && (s / barMinutes) * barSpacing >= minGapPx) ??
      stepMinutes;
  }
  const dayStep = DAY_STEPS.find((s) => s * barSpacing >= minGapPx) ?? 0;

  for (let i = Math.max(from, 1); i <= to; i += 1) {
    const prev = calendarParts(times[i - 1]!, offsetMinutes);
    const cur = calendarParts(times[i]!, offsetMinutes);
    if (!intraday) {
      if (cur.year !== prev.year) candidates.push({ index: i, label: labels.year(cur.year), major: true, rank: 0 });
      else if (cur.month !== prev.month) candidates.push({ index: i, label: labels.month(cur.month), major: false, rank: 1 });
      else if (dayStep && cur.day % dayStep === 0 && cur.day !== prev.day)
        candidates.push({ index: i, label: labels.day(cur.month, cur.day), major: false, rank: 2 });
    } else if (cur.day !== prev.day) {
      candidates.push({ index: i, label: labels.day(cur.month, cur.day), major: true, rank: 0 });
    } else {
      const minuteOfDay = cur.hour * 60 + cur.minute;
      const prevMinuteOfDay = prev.hour * 60 + prev.minute;
      if (Math.floor(minuteOfDay / stepMinutes) !== Math.floor(prevMinuteOfDay / stepMinutes)) {
        candidates.push({ index: i, label: labels.time(cur.hour, cur.minute), major: false, rank: 1 });
      }
    }
  }

  // 큰 경계부터 자리를 잡는다
  const kept: TimeTick[] = [];
  const taken = (index: number) => kept.some((t) => Math.abs(t.index - index) < minBars);
  for (const rank of [0, 1, 2]) {
    for (const c of candidates) {
      if (c.rank === rank && !taken(c.index)) kept.push({ index: c.index, label: c.label, major: c.major });
    }
  }
  return kept.sort((a, b) => a.index - b.index);
};
