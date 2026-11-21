import { MOBILE_ROUTES } from "./redirect";

/**
 * 휴대폰 오프라인 마지막 화면 한 벌(`FE-REQ-073` FR-1 · FR-2, `ADR-012` 순서 3) — 플랫폼 무관 계약.
 *
 * 서비스 워커 캐시가 아니라 **화면 숫자 한 벌**을 IndexedDB 에 둔다 — Cache API 는 캐시 헤더를 무시하고 만료가 없다(리서치 §1).
 * 담는 것은 API 응답이 아니라 **표시용 글자**(제목 · 이름 · 값) — 서버가 준 문자열을 화면이 고른 그대로. 계산 0.
 *
 * 저장(`@repo/web-shared/lib` `saveOfflineSnapshot`) · 화면 대체(`MobileOfflineFallback`) · 오프라인 한 장의 인라인 스크립트(`routes.ts`)가
 * 이 파일의 이름 · 판정을 같이 쓴다.
 */

/** IndexedDB 이름 · 판 · 저장소 — 판을 올리면 옛 저장소를 지운다(`upgradeneeded`) */
export const OFFLINE_DB = { name: "salt-m-offline", version: 1, store: "snapshots" } as const;

/** 한 벌을 두는 화면 — 탭 화면 셋(투자는 시세라 지난 값이 오히려 틀린 정보다) */
export const OFFLINE_SCREENS = {
  home: MOBILE_ROUTES.home,
  goals: MOBILE_ROUTES.goals,
  household: MOBILE_ROUTES.household,
} as const;

export type OfflineScreen = keyof typeof OFFLINE_SCREENS;

/** 구역 하나의 행 상한 — 한 벌은 "무엇이 얼마였나"까지. 긴 목록 전체를 들고 다니지 않는다 */
export const OFFLINE_ROWS_MAX = 20;

export interface OfflineRow {
  label: string;
  value: string;
  /** 이름 아래 작은 줄(분류 · 날짜 …) */
  sub?: string;
}

export interface OfflineSection {
  title: string;
  rows: OfflineRow[];
}

/** 화면 한 벌 — 제목 · 구역. 값은 이미 표시용 글자다 */
export interface OfflineSnapshot {
  screen: OfflineScreen;
  title: string;
  sections: OfflineSection[];
}

/** 저장 행 — 키는 `screen`. 사용자 id 가 다르면 읽지 않고 지운다 */
export interface OfflineRecord {
  screen: OfflineScreen;
  userId: string;
  /** 받은 시각(ms) — "HH:MM 기준" */
  fetchedAt: number;
  snapshot: OfflineSnapshot;
}

const isScreen = (value: unknown): value is OfflineScreen => typeof value === "string" && Object.hasOwn(OFFLINE_SCREENS, value);

/** 문서 경로 → 화면(끝 슬래시 · 질의는 버린다). 한 벌이 없는 화면이면 null */
export const offlineScreenOf = (pathname: string): OfflineScreen | null => {
  const path = pathname.split(/[?#]/)[0]!.replace(/\/+$/, "");
  const hit = (Object.keys(OFFLINE_SCREENS) as OfflineScreen[]).find((screen) => OFFLINE_SCREENS[screen] === path);
  return hit ?? null;
};

const isRow = (value: unknown): value is OfflineRow => {
  const row = value as OfflineRow | null;
  return (
    typeof row === "object" &&
    row !== null &&
    typeof row.label === "string" &&
    typeof row.value === "string" &&
    (row.sub === undefined || typeof row.sub === "string")
  );
};

/** 저장소에서 꺼낸 값이 이 판의 모양인가 — 옛 판 · 깨진 행은 없는 것으로 */
export const isOfflineRecord = (value: unknown): value is OfflineRecord => {
  const record = value as OfflineRecord | null;
  if (typeof record !== "object" || record === null) return false;
  if (!isScreen(record.screen) || typeof record.userId !== "string" || record.userId === "") return false;
  if (typeof record.fetchedAt !== "number" || !Number.isFinite(record.fetchedAt)) return false;
  const snap = record.snapshot;
  if (typeof snap !== "object" || snap === null || snap.screen !== record.screen || typeof snap.title !== "string") return false;
  return (
    Array.isArray(snap.sections) &&
    snap.sections.every((section) => typeof section?.title === "string" && Array.isArray(section.rows) && section.rows.every(isRow))
  );
};

/**
 * 불변식: **그 사용자의 한 벌만 그린다.** 지금 사용자가 없으면(로그아웃 · 세션 죽음) 아무것도, 다르면 아무것도.
 * 저장 쪽은 다른 사용자 행이 있으면 먼저 비운다 — 이 판정은 그래도 남은 행을 막는 두 번째 줄
 */
export const offlineRecordFor = (value: unknown, userId: string | null, screen: OfflineScreen): OfflineRecord | null => {
  if (!userId || !isOfflineRecord(value)) return null;
  return value.userId === userId && value.screen === screen ? value : null;
};

/** 구역 행을 상한으로 자르고 빈 구역은 뺀다 — 저장 직전에 부른다 */
export const trimOfflineSnapshot = (snapshot: OfflineSnapshot): OfflineSnapshot => ({
  ...snapshot,
  sections: snapshot.sections
    .map((section) => ({ title: section.title, rows: section.rows.slice(0, OFFLINE_ROWS_MAX) }))
    .filter((section) => section.rows.length > 0),
});

const SEOUL = "Asia/Seoul";
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: SEOUL, year: "numeric", month: "2-digit", day: "2-digit" });
const clockFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: SEOUL, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: SEOUL, month: "numeric", day: "numeric" });

/**
 * "기준" 시각 글자 — 오늘(서울)이면 `14:05`, 아니면 `11. 20. 14:05`. **브라우저에서만 부른다**(지금 시각을 받는다 — 렌더 밖 효과에서).
 * 오프라인 한 장의 인라인 스크립트도 같은 형식(`routes.ts` 시험이 대조)
 */
export const offlineStampText = (fetchedAt: number, now: number): string => {
  const at = new Date(fetchedAt);
  const clock = clockFormatter.format(at);
  return dayFormatter.format(at) === dayFormatter.format(new Date(now)) ? clock : `${dateFormatter.format(at)} ${clock}`;
};
