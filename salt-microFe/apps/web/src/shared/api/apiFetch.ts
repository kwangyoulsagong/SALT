/**
 * 앱 API 의 fetch 진입점 (`fsd-shared.md` — "`shared/api` 가 BFF 호출의 유일한 경로다").
 *
 * ## 왜 맨 `fetch` 가 아닌가
 *
 * 개발에서 `/api/v1/*` 는 MSW 워커가 받는다. 그런데 워커 기동은 `app/providers` 의
 * **effect** 이고 화면의 조회는 그 effect 와 **경쟁한다**. 실측(2026-09-18)에서
 * 워커가 붙기 2초 전에 나간 요청 3건이 전부 404 로 떨어졌다 — 리로드마다 홈이 깨졌다.
 *
 * 렌더를 막아 해결하지 않는다. 그러면 서버 렌더와 클라이언트 첫 렌더의 마크업이 달라져
 * `ssr.md` 를 정면으로 어기고, 스트리밍 SSR(`FE-REQ-008`)을 dev 에서 볼 수 없게 된다.
 * 그래서 **막는 자리를 렌더가 아니라 요청으로 내렸다.**
 *
 * 프로덕션에서는 게이트가 없다 — `whenMocksReady()` 가 즉시 resolve 된다.
 *
 * > BFF 이관(`FE-REQ-012`) 때 토큰 부착·에러 정규화·타임아웃이 이 함수 위에 붙는다.
 *
 * ## 401 이면 토큰을 갱신하고 한 번 다시 보낸다 (`FE-REQ-011` FR-62)
 *
 * 액세스 토큰은 15분이다. 갱신을 호출하는 쪽에 두면 새 슬라이스가 그것을 잊고, 잊은
 * 화면은 로그인 15분 뒤 "데이터 없음"으로 보인다 — 2026-09-23 에 코치 패널 · 관심 목록 ·
 * 포트폴리오가 동시에 그렇게 죽어 있었다. **여기 두면 아무도 잊을 수 없다.**
 *
 * 규칙(1회 재시도 · `Authorization` 을 실어 보낸 요청만 · 동시 401 은 갱신 1회)은
 * `@repo/core/auth` 에 있고 테스트가 붙어 있다. 이 파일은 그것에 목 게이트를 씌운다.
 */
import { withAuthRefresh } from "@repo/core/auth";

import { mockGatedFetch } from "./mockGate";
import { refreshAccessToken } from "./refreshSession";

export const apiFetch: typeof fetch = withAuthRefresh({
  fetchImpl: mockGatedFetch,
  refreshAccessToken,
});
