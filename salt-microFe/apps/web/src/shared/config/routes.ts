/**
 * 이 zone 의 라우트 경로.
 *
 * **zone 을 넘는 경로는 여기 없다.** 그것은 `@repo/core/zones` 가 소유하고
 * `shared/ui` 의 `CrossZoneLink` 만 사용한다 (`microfrontend.md`).
 */
export const ROUTES = {
  login: "/",
  home: "/home",
  investments: "/investments",
  addGoal: "/goals/addgoals",
} as const;

export {
  CROSS_ZONE_PATH_PREFIXES,
  ZONES,
  isCrossZonePath,
} from "@repo/core/zones";
