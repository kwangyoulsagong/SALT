/**
 * 앱 API 의 fetch 진입점 (`fsd-shared.md` — "`shared/api` 가 BFF 호출의 유일한 경로다").
 *
 * ## 401 이면 토큰을 갱신하고 한 번 다시 보낸다 (`FE-REQ-011` FR-62)
 *
 * 액세스 토큰은 15분이다. 갱신을 호출하는 쪽에 두면 새 슬라이스가 그것을 잊고, 잊은
 * 화면은 로그인 15분 뒤 "데이터 없음"으로 보인다 — 2026-09-23 에 코치 패널 · 관심 목록 ·
 * 포트폴리오가 동시에 그렇게 죽어 있었다. **여기 두면 아무도 잊을 수 없다.**
 *
 * 규칙(1회 재시도 · `Authorization` 을 실어 보낸 요청만 · 동시 401 은 갱신 1회)은
 * `@repo/core/auth` 에 있고 테스트가 붙어 있다.
 *
 * 2026-09-23 — MSW 목과 목 기동을 기다리던 게이트(`mockGate`)를 지웠다. 모든 호출이 실제 BFF 다.
 */
import { withAuthRefresh } from "@repo/core/auth";

import { refreshAccessToken } from "./refreshSession";

export const apiFetch: typeof fetch = withAuthRefresh({
  fetchImpl: (input, init) => fetch(input, init),
  refreshAccessToken,
});
