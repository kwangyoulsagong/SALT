/**
 * zone 간 이동 계측 (`FE-REQ-054` FR-6) — 전환 시간 · prerender 적중률을 브라우저별로.
 *
 * 탭을 누른 순간을 떠나는 문서가 적어 두고(`ZONE_NAV_STORAGE_KEY`, sessionStorage — 같은 탭 · 같은 origin 이라 zone 을 넘어 남는다),
 * 도착한 문서가 첫 그림 뒤에 읽어 한 건을 만든다. 계산은 여기(순수 함수) · 읽고 쓰는 일은 웹 레이아웃이 한다.
 *
 * prerender 적중은 도착 문서의 Navigation Timing `activationStart > 0` 이다 — 미리 렌더된 문서가 활성화된 시각.
 * 보낼 곳(관측성 수집처)은 아직 없다 — 웹은 `performance.mark` 로 남겨 DevTools 에서 본다. 수집처가 정해지면 그 한 곳만 바꾼다.
 */
export const ZONE_NAV_STORAGE_KEY = "salt:zone-nav";
/** 이보다 오래된 표지는 버린다 — 탭을 누르고 다른 일을 하다 돌아온 이동은 전환 시간이 아니다 */
export const ZONE_NAV_MAX_AGE_MS = 30_000;

export type BrowserFamily = "chromium" | "safari" | "firefox" | "other";

export interface ZoneNavigationStart {
  readonly fromZone: string;
  readonly toZone: string;
  /** 누른 시각(epoch ms) */
  readonly at: number;
}

export interface ZoneNavigationMetric {
  readonly fromZone: string;
  readonly toZone: string;
  /** 누른 때부터 도착 문서가 첫 그림을 낸 때까지(ms) */
  readonly durationMs: number;
  readonly prerendered: boolean;
  readonly browser: BrowserFamily;
}

/** UA 로 브라우저 계열만 가른다(버전 · 기기는 보지 않는다). Chromium 계열은 Edge · 웨일 등을 포함한다 */
export const browserFamily = (userAgent: string): BrowserFamily => {
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (/(Chrome|Chromium|CriOS|Edg)\//.test(userAgent)) return "chromium";
  if (/Safari\//.test(userAgent)) return "safari";
  return "other";
};

/** 저장된 표지를 읽는다 — 깨졌거나 모양이 다르면 `null` */
export const parseZoneNavigationStart = (raw: string | null): ZoneNavigationStart | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ZoneNavigationStart>;
    if (typeof value.fromZone !== "string" || typeof value.toZone !== "string" || typeof value.at !== "number") {
      return null;
    }
    return { fromZone: value.fromZone, toZone: value.toZone, at: value.at };
  } catch {
    return null;
  }
};

/**
 * 표지 + 도착 문서 정보 → 한 건. 도착 zone 이 표지와 다르면(다른 링크로 왔다) · 너무 오래됐으면 · 시계가 거꾸로면 `null`.
 * `arrivedAt` 은 도착 문서가 보이기 시작한 시각(epoch ms) — prerender 면 활성화 시각이다.
 */
export const buildZoneNavigationMetric = (input: {
  start: ZoneNavigationStart | null;
  currentZone: string;
  arrivedAt: number;
  activationStart: number;
  userAgent: string;
}): ZoneNavigationMetric | null => {
  const { start, currentZone, arrivedAt, activationStart, userAgent } = input;
  if (!start || start.toZone !== currentZone) return null;
  const durationMs = Math.round(arrivedAt - start.at);
  if (durationMs < 0 || durationMs > ZONE_NAV_MAX_AGE_MS) return null;
  return {
    fromZone: start.fromZone,
    toZone: start.toZone,
    durationMs,
    prerendered: activationStart > 0,
    browser: browserFamily(userAgent),
  };
};
