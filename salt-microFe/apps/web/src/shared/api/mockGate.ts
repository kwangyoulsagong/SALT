/**
 * MSW 워커 준비 게이트 (개발 전용).
 *
 * 워커를 **기동하는 쪽**은 `app/providers/MockServiceWorker` 다 — `shared` 는 `msw` 를
 * import 하지 않는다. 여기 있는 것은 "준비됐다"는 신호 하나뿐이라 레이어를 거스르지 않는다.
 *
 * `typeof window` 는 **함수 안에서만** 읽는다. 모듈 최상단 분기는 서버 컴파일에서도
 * 평가되므로 신뢰하지 않는다 (`ssr.md` §App Router).
 */

const isMockMode = process.env.NODE_ENV === "development";

let markReady: () => void = () => {};

const mocksReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

/**
 * 워커 기동이 끝났음을 알린다. **성공·실패와 무관하게 부른다** — 기동이 실패했을 때
 * 게이트가 영원히 닫혀 있으면 조회가 멈춘 채로 남는다. 그때는 요청을 그냥 내보내고
 * 404 를 보는 편이 낫다.
 */
export const markMocksReady = () => markReady();

/** 개발 브라우저에서만 기다린다. 서버·프로덕션에서는 즉시 통과한다. */
export const whenMocksReady = (): Promise<void> => {
  if (!isMockMode || typeof window === "undefined") return Promise.resolve();

  return mocksReady;
};

/**
 * 목 게이트를 지난 `fetch`. `apiFetch` 가 이 위에 401 갱신을 얹는다 —
 * 게이트와 갱신을 한 함수에 섞으면 둘 중 하나만 테스트할 수 없다.
 */
export const mockGatedFetch: typeof fetch = async (input, init) => {
  await whenMocksReady();

  return fetch(input, init);
};
