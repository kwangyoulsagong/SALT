/**
 * MSW 핸들러. **로그인 목을 지웠다(2026-09-23).**
 *
 * `POST /api/v1/auth/login` 목이 `token: "mock-jwt-token"` 을 돌려주고 있었다. 화면은 그것을
 * 세션으로 저장했고, 그 토큰으로 `/api/app/*` 를 부르면 서버가 전부 401 을 줬다 —
 * **로그인은 성공한 것처럼 보이고 데이터만 없는 상태**가 만들어졌다. 실제 로그인 경로
 * (`POST /api/auth/login`, BFF 프록시)가 있으므로 목을 남겨 둘 이유가 없다.
 *
 * 그래서 이제 개발에서도 **로그인은 BFF · 서버가 떠 있어야 된다.**
 */
import { goalsHandlers } from "@repo/mocks/goals";
import { investmentsHandlers } from "@repo/mocks/investments";
import { rankingHandlers } from "@repo/mocks/ranking";
import { openBankHandlers } from "@repo/mocks/bank";

export const handlers = [
  ...goalsHandlers,
  ...investmentsHandlers,
  ...rankingHandlers,
  ...openBankHandlers,
];
