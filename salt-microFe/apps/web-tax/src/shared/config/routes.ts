/**
 * 세금 zone 의 라우트 경로.
 *
 * zone 레지스트리의 단일 소스는 `@repo/core/zones` 다. 앱은 여기만 본다.
 */
export const ROUTES = {
  tax: "/tax",
} as const;

export {
  CROSS_ZONE_PATH_PREFIXES,
  ZONES,
  isCrossZonePath,
} from "@repo/core/zones";
