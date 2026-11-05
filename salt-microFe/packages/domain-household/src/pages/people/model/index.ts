import { privatePageMetadata } from "@repo/web-shared/config";

/** 사람 장부 화면 문구(가계부 S1h) — 사실만. "갚을 돈" · 차액 · 평가 0 */
export const PEOPLE_PAGE = {
  back: "가계부로",
  title: "사람 장부",
  description: "누구와 어떤 일로 얼마를 주고받았는지 적어 두는 곳이에요",
  blockName: "사람 장부",
  people: "사람별",
  peopleEmpty: "아직 적은 사람이 없어요",
  tally: (gave: string, received: string, count: number) => `준 돈 ${gave} · 받은 돈 ${received} · ${count}번`,
  lastOn: (date: string) => `마지막 ${date}`,
  year: (y: number) => `${y}년`,
  prevYear: "이전 해",
  nextYear: "다음 해",
  yearTotals: (gave: string, received: string) => `준 돈 ${gave} · 받은 돈 ${received}`,
  // 이름 뒤 조사(와/과)를 붙이지 않는다 — 받침에 따라 갈린다(확인 단계 결함 "이서연와")
  personTitle: (name: string) => `${name} · 주고받은 것`,
  allYears: "모든 해",
  backToYear: "해 목록으로",
  signedOut: "로그인하면 볼 수 있어요",
  loadFailed: "불러오지 못했어요",
} as const;

/** 상대 이름이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("사람 장부");

/** `?year=` — 숫자 넷이면 그 해, 아니면 null(올해 — 범위 검사는 서버) */
export const readYear = (raw: string | string[] | undefined): number | null => {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^\d{4}$/.test(v) ? Number(v) : null;
};

export const readPerson = (raw: string | string[] | undefined): string | null => {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return v ? v : null;
};

/** 주소 — 선택은 주소에(`screen-desktop.md` §4) */
export const peopleHref = (base: string, q: { year?: number | null; person?: string | null }): string => {
  const params = new URLSearchParams();
  if (q.year) params.set("year", String(q.year));
  if (q.person) params.set("person", q.person);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};
