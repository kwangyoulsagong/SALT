/**
 * zone 레지스트리 (FE-REQ-007 FR-3 · FR-4 · FR-12).
 *
 * Multi-Zones에서 조립은 **요청 라우팅**에서 일어난다. 그래서 "어떤 경로가 어느 zone의 것인가"를
 * 한 곳에서 알아야 한다. 그 한 곳이 여기다.
 *
 * 규칙은 `salt-microFe/.claude/rules/microfrontend.md`에 있다.
 * zone을 추가하려면 그 문서 §2의 세 조건을 **모두** 만족해야 한다.
 */

export const ZONE_IDS = ["default", "tax"] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneDescriptor {
  /** 이 zone을 서비스하는 워크스페이스 앱 이름 */
  readonly app: string;
  /** 개발 서버 포트 */
  readonly devPort: number;
  /**
   * 이 zone이 담당하는 경로 prefix. **zone 간 유일해야 한다** (FR-4).
   * 판정은 `정확히 일치` 또는 `prefix + "/"` 로 시작 — 그래서 `/tax`는 `/taxes`를 잡지 않는다.
   */
  readonly pathPrefixes: readonly string[];
  /** 정적 자산 prefix. default zone은 `assetPrefix`를 갖지 않는다. */
  readonly assetPrefix: string | null;
  /** 왜 별도 zone인가 (microfrontend.md §2의 세 조건) */
  readonly reason: string;
}

export const ZONES: Readonly<Record<ZoneId, ZoneDescriptor>> = {
  default: {
    app: "web",
    devPort: 3000,
    pathPrefixes: ["/", "/home", "/investments", "/goals"],
    assetPrefix: null,
    reason:
      "3탭이 전부 여기 있다. 탭 경계로 zone을 자르면 가장 잦은 이동이 full reload가 된다.",
  },
  tax: {
    app: "web-tax",
    devPort: 3001,
    pathPrefixes: ["/tax"],
    assetPrefix: "/tax-static",
    reason:
      "① 방문 빈도가 낮다(연말·5월) ② 릴리스 이유가 다르다 — 법령 파라미터 변경 ③ 취득가액 lot 엔진·손실수확 솔버·환율 로직이 매일 쓰는 번들에 실릴 이유가 없다.",
  },
};

/** 한 zone이 서비스하는 경로 prefix 전부 (정적 자산 prefix 포함). */
const ownedPrefixes = (zoneId: ZoneId): readonly string[] => {
  const zone = ZONES[zoneId];
  return zone.assetPrefix
    ? [...zone.pathPrefixes, zone.assetPrefix]
    : zone.pathPrefixes;
};

/**
 * `from` zone에서 봤을 때 **zone을 넘는** 경로 prefix 목록.
 *
 * 이 목록에 걸리는 경로는 hard navigation이다. `<Link>`가 아니라 `<a>`(또는 `CrossZoneLink`)를 쓴다.
 * ESLint 규칙 `@repo/zone/no-cross-zone-link`가 같은 목록을 `zonePaths` 옵션으로 받아 강제한다.
 * **두 곳의 값이 어긋나면 안 된다.**
 */
export const crossZonePathPrefixes = (from: ZoneId): readonly string[] =>
  ZONE_IDS.filter((id) => id !== from).flatMap(ownedPrefixes);

/** default zone 기준 cross-zone prefix. `apps/web`이 쓰는 값이다. */
export const CROSS_ZONE_PATH_PREFIXES = crossZonePathPrefixes("default");

/** `prefix` 자신이거나 `prefix/`로 시작하는가. `/tax`는 `/taxes`를 잡지 않는다. */
const matchesPrefix = (href: string, prefix: string): boolean =>
  href === prefix || href.startsWith(prefix === "/" ? "/" : `${prefix}/`);

/**
 * 주어진 경로가 `from` zone을 벗어나는가.
 *
 * default zone의 `"/"`는 "루트 하나"만 뜻한다. 나머지 경로를 전부 삼키지 않도록
 * prefix가 `"/"`인 경우는 정확히 일치할 때만 걸리게 한다.
 */
export const isCrossZonePath = (
  href: string,
  from: ZoneId = "default"
): boolean => {
  if (!href.startsWith("/")) return false;

  return crossZonePathPrefixes(from).some((prefix) =>
    prefix === "/" ? href === "/" : matchesPrefix(href, prefix)
  );
};
