/**
 * BFF 호출에 붙일 토큰을 읽는다.
 *
 * ## 왜 `shared/api` 인가
 *
 * 토큰 부착은 **네트워크의 일**이고, 이것을 필요로 하는 슬라이스가 둘 이상이다
 * (`entities/market` 조회 · `features/toggle-watchlist` mutation). 어느 한 슬라이스에
 * 두면 다른 슬라이스가 cross-slice import 로 가져가야 한다 (`fsd-entities.md` §2).
 *
 * ## 이 함수는 `localStorage` 를 읽는다 — 그게 지금의 미달이다
 *
 * `FE-REQ-008` §6-4 가 명시한 미충족 항목이고 `FE-REQ-013` 이 쿠키로 옮긴다. 그때
 * **이 파일 하나만** 바뀌도록 읽는 자리를 여기로 모았다. 쿠키가 되면 서버 컴포넌트도
 * 토큰을 볼 수 있고, 그때 관심 목록 조회가 `FE-REQ-012` 의 호출 배치대로
 * 서버 컴포넌트로 내려간다.
 *
 * 서버(SSR)에서는 `null` 이다. `typeof window` 는 **함수 안에서만** 읽는다 —
 * 모듈 최상단 분기는 서버 컴파일에서도 평가된다 (`ssr.md`).
 */
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "@/shared/config";

export const readAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    // Safari 프라이빗 모드는 `localStorage` 접근 자체가 던진다. 토큰 없음으로 본다.
    return null;
  }
};

/**
 * 갱신에 쓸 리프레시 토큰. 액세스 토큰과 **같은 자리에서** 읽는다(`FE-REQ-013` 이관 단위).
 */
export const readRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * 세션을 비운다 — **리프레시까지 죽었을 때만** 부른다(`FE-REQ-011` FR-62).
 *
 * 네트워크 실패로 부르지 않는다. 오프라인 한 번에 로그아웃이 되면 사용자는 자기가
 * 뭘 했는지 알 수 없다. 지우는 것은 "서버가 이 세션을 거부했다"가 확인된 경우다.
 */
export const clearSession = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // 지울 수 없으면 다음 인증 호출이 401 이다 — 그게 사용자에게 보이는 정직한 상태다.
  }
};

/**
 * 세션을 저장한다 — **토큰을 쓰는 유일한 자리**.
 *
 * ## 이 함수가 없어서 인증 호출이 전부 401 이었다 (2026-09-18)
 *
 * `ACCESS_TOKEN_KEY` 를 **읽는 코드만 있고 쓰는 코드가 없었다.** `useSignIn` 은
 * `USER_KEY` 만 저장했고, 그래서 로그인에 성공해도 `authHeader()` 가 언제나 빈 객체였다.
 * 관심 목록·포트폴리오 요약·온보딩 상태처럼 `/api/app/*` 를 부르는 경로가 전부 401 이
 * 되는데, 화면은 "데이터가 없음"으로 그려서 **빌드도 타입체크도 통과하는 상태로 조용히
 * 깨져 있었다.** 이 레포가 관심 목록 슬라이스에서 배운 것과 같은 모양이다 —
 * 소비처가 없는 계약은 검증되지 않는다.
 *
 * 읽기와 쓰기를 같은 파일에 두는 이유는 `FE-REQ-013` 이 쿠키로 옮길 때 **이 파일 하나만**
 * 바뀌게 하기 위해서다.
 */
export const writeSession = (session: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): void => {
  if (typeof window === "undefined") return;

  try {
    if (session.accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    }
    if (session.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    }
  } catch {
    // 프라이빗 모드에서는 저장이 던진다. 세션 없이 진행한다 — 다음 인증 호출이 401 이고
    // 그게 사용자에게 보이는 정직한 상태다.
  }
};

/**
 * `Authorization` 헤더. 토큰이 없으면 **빈 객체**다.
 *
 * `Bearer null` 을 보내지 않는다 — BFF 가 401 대신 토큰 파싱 실패로 떨어지고,
 * 그러면 "로그인이 필요하다"와 "토큰이 깨졌다"가 같은 에러로 보인다.
 */
export const authHeader = (): Record<string, string> => {
  const token = readAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
