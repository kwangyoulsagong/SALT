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
import { ACCESS_TOKEN_KEY } from "@/shared/config";

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
 * `Authorization` 헤더. 토큰이 없으면 **빈 객체**다.
 *
 * `Bearer null` 을 보내지 않는다 — BFF 가 401 대신 토큰 파싱 실패로 떨어지고,
 * 그러면 "로그인이 필요하다"와 "토큰이 깨졌다"가 같은 에러로 보인다.
 */
export const authHeader = (): Record<string, string> => {
  const token = readAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
