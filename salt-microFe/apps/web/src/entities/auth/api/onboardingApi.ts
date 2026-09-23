import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { OnboardingStatus } from "../model/types";
import { ONBOARDING_ENDPOINTS } from "./endpoints";

/**
 * 조회만 둔다 — 초대 수락(mutation)은 `features/accept-invite` 의 것이다.
 *
 * ## `axios` 를 쓰지 않는다
 *
 * 이 조회는 **홈 카드**가 부른다. `/home` 은 axios 를 쓰지 않던 화면이라, 여기서
 * import 하면 GET 하나에 라이브러리가 통째로 딸려 들어와 First Load 가 **+30 kB** 가
 * 된다. 앞선 슬라이스(`F000-watchlist-tab`) 회고가 같은 회귀를 두 번 기록했고
 * 실제로 이번에도 한 번 만들었다가 되돌렸다.
 *
 * `apiFetch` 는 `shared/api` 의 fetch 진입점이고 401 이면 토큰을 갱신해 한 번 다시 보낸다.
 */
export const onboardingApi = {
  status: async (): Promise<OnboardingStatus> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.status()}`,
      { headers: authHeader() },
    );

    if (!response.ok) {
      throw new Error(`onboarding status failed: ${response.status}`);
    }

    return (await response.json()) as OnboardingStatus;
  },
};
