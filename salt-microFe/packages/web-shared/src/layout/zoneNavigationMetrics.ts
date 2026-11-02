import {
  ZONE_NAV_STORAGE_KEY,
  buildZoneNavigationMetric,
  parseZoneNavigationStart,
  type ZoneNavigationMetric,
} from "@repo/core/navigation";

/**
 * zone 간 이동 계측 — 브라우저 쪽 읽기 · 쓰기 (`FE-REQ-054` FR-6). 계산은 `@repo/core/navigation`.
 *
 * 남는 곳은 `performance.mark("salt:zone-nav", { detail })` — DevTools Performance · `performance.getEntriesByName` 으로 본다.
 * 수집처(관측성)는 아직 없다. 정해지면 `report` 한 곳을 바꾼다.
 */
export const ZONE_NAV_MARK = "salt:zone-nav";

/** 탭을 누른 순간(클릭 핸들러 안 — 렌더 중이 아니다) */
export const recordZoneNavigationStart = (fromZone: string, toZone: string): void => {
  try {
    sessionStorage.setItem(ZONE_NAV_STORAGE_KEY, JSON.stringify({ fromZone, toZone, at: Date.now() }));
  } catch {
    // 저장소가 막힌 브라우저(사생활 모드 등) — 계측만 빠진다
  }
};

const report = (metric: ZoneNavigationMetric): void => {
  performance.mark(ZONE_NAV_MARK, { detail: metric });
  if (process.env.NODE_ENV !== "production") console.info(ZONE_NAV_MARK, metric);
};

/** 도착한 문서가 마운트 뒤 한 번 — 표지를 읽고 지운다 */
export const readZoneNavigationMetric = (currentZone: string): void => {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(ZONE_NAV_STORAGE_KEY);
    sessionStorage.removeItem(ZONE_NAV_STORAGE_KEY);
  } catch {
    return;
  }
  const navigation = performance.getEntriesByType("navigation")[0] as
    | (PerformanceNavigationTiming & { activationStart?: number })
    | undefined;
  const activationStart = navigation?.activationStart ?? 0;
  // 보이기 시작한 때: prerender 면 활성화 시각, 아니면 첫 그림(없으면 지금)
  const firstPaint = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
  const visibleAt = activationStart > 0 ? activationStart : (firstPaint ?? performance.now());
  const metric = buildZoneNavigationMetric({
    start: parseZoneNavigationStart(raw),
    currentZone,
    arrivedAt: performance.timeOrigin + visibleAt,
    activationStart,
    userAgent: navigator.userAgent,
  });
  if (metric) report(metric);
};
