/**
 * zone 레지스트리 (FE-REQ-007 FR-3 · FR-4 · FR-12 → FE-REQ-052 FR-2, ADR-005).
 *
 * Multi-Zones에서 조립은 **요청 라우팅**에서 일어난다. 그래서 "어떤 경로가 어느 zone의 것인가"를
 * 한 곳에서 알아야 한다. 그 한 곳이 `registry.json` 이다 — 이 파일(TS)과 `registry.cjs`(next.config ·
 * eslint · 훅)가 같은 데이터를 읽고, 계산이 같은지는 `registry.test.ts` 가 대조한다.
 *
 * 규칙은 `salt-microFe/.claude/rules/microfrontend.md` — **zone 하나 = 도메인 하나.**
 * 새 zone 은 새 도메인일 때만, `ADR-005` 표 개정이 먼저다.
 */
import data from "./registry.json";

export const ZONE_IDS = ["shell", "invest", "savings", "household", "tips"] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneDescriptor {
  /** 이 zone을 서비스하는 워크스페이스 앱 이름 */
  readonly app: string;
  /** 도메인 이름 — BFF 경로 · 서버 서비스 · RN 번들과 같다. 셸은 `null` */
  readonly domain: string | null;
  /** 화면 코드 패키지(`packages/domain-*`). 셸은 `null` */
  readonly domainPackage: string | null;
  /** 개발 서버 포트 */
  readonly devPort: number;
  /**
   * 이 zone이 담당하는 경로 prefix. **zone 간 유일해야 한다.**
   * 판정은 `정확히 일치` 또는 `prefix + "/"` 로 시작 — 그래서 `/tips`는 `/tipsy`를 잡지 않는다.
   */
  readonly pathPrefixes: readonly string[];
  /** 정적 자산 prefix. 셸은 `assetPrefix`를 갖지 않는다. */
  readonly assetPrefix: string | null;
  /**
   * 이 도메인 화면을 **지금 실제로** 서비스하는 앱. 옮기기 전에는 셸(`web`)이다.
   * 옮기는 REQ(`hostedUntil`)가 닫히면 자기 `app` 으로 바꾼다.
   */
  readonly hostedIn: string;
  readonly hostedUntil: string | null;
  readonly reason: string;
}

export const ZONES = data.zones as Readonly<Record<ZoneId, ZoneDescriptor>>;

/** 셸 앱 이름 — 기본 관찰 지점 */
export const SHELL_APP = ZONES.shell.app;

/**
 * `fromApp` 에서 봤을 때 **zone(앱)을 넘는** 경로 prefix 목록.
 *
 * 경로는 그 화면을 지금 서비스하는 앱(`hostedIn`) 기준, 정적 자산 prefix 는 늘 자기 zone 앱.
 * 이 목록에 걸리는 경로는 hard navigation이다. `<Link>`가 아니라 `CrossZoneLink`(`<a>`)를 쓴다.
 * ESLint 규칙 `@repo/zone/no-cross-zone-link`가 같은 데이터로 같은 계산을 한다(`registry.cjs`).
 */
export const crossZonePathPrefixes = (fromApp: string = SHELL_APP): readonly string[] =>
  ZONE_IDS.flatMap((id) => {
    const zone = ZONES[id];
    const paths = zone.hostedIn === fromApp ? [] : zone.pathPrefixes;
    const assets = zone.assetPrefix && zone.app !== fromApp ? [zone.assetPrefix] : [];
    return [...paths, ...assets];
  });

/** 셸 기준 cross-zone prefix. `apps/web`이 쓰는 값이다. */
export const CROSS_ZONE_PATH_PREFIXES = crossZonePathPrefixes(SHELL_APP);

/** `prefix` 자신이거나 `prefix/`로 시작하는가. */
const matchesPrefix = (href: string, prefix: string): boolean =>
  href === prefix || href.startsWith(`${prefix}/`);

/**
 * 주어진 경로가 `fromApp` 을 벗어나는가.
 *
 * 셸의 `"/"`는 "루트 하나"만 뜻한다. 나머지 경로를 전부 삼키지 않도록
 * prefix가 `"/"`인 경우는 정확히 일치할 때만 걸리게 한다.
 */
export const isCrossZonePath = (href: string, fromApp: string = SHELL_APP): boolean => {
  if (!href.startsWith("/")) return false;
  const path = href.split(/[?#]/)[0] ?? href;

  return crossZonePathPrefixes(fromApp).some((prefix) =>
    prefix === "/" ? path === "/" : matchesPrefix(path, prefix)
  );
};

/** 경로를 담당하는 zone. 셸 `"/"` 는 정확히 일치만. 어느 zone 에도 없으면 셸(default). */
export const zoneOfPath = (href: string): ZoneId => {
  const path = href.split(/[?#]/)[0] ?? href;
  const owner = ZONE_IDS.find((id) =>
    ZONES[id].pathPrefixes.some((prefix) =>
      prefix === "/" ? path === "/" : matchesPrefix(path, prefix)
    )
  );
  return owner ?? "shell";
};
