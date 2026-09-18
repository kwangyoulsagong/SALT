/**
 * 온보딩 upstream 경로.
 *
 * origin 은 `shared/config` 가 갖고 **경로는 부르는 슬라이스가 갖는다**
 * (`entities/market/api/endpoints.ts` 와 같은 규칙).
 *
 * 셋 다 BFF 가 소유한 **화면 계약**(`/api/app/*`)이다. 서버 도메인 경로
 * (`/api/auth/invite/*` · `/api/onboarding/status`)를 프론트가 직접 부르지 않는다 —
 * 그 경로의 응답은 `{ success, message, data }` 봉투이고 화면이 봉투를 벗기기 시작하면
 * 서버 계약 변경이 곧바로 화면을 깬다.
 */
export const ONBOARDING_ENDPOINTS = {
  status: () => `/api/app/onboarding/status`,
  inviteCheck: (code: string) =>
    `/api/app/onboarding/invite/check?code=${encodeURIComponent(code)}`,
  invite: () => `/api/app/onboarding/invite`,
} as const;
