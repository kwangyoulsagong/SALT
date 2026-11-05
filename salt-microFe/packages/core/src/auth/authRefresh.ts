/**
 * 액세스 토큰 갱신 정책 (`FE-REQ-013`).
 *
 * ## 왜 `core` 인가
 *
 * 저장은 앱마다 다르다 — 웹은 httpOnly 쿠키(`FE-REQ-013` FR-80 2단계), RN 은 보안 저장소다.
 * 그러나 **"401 이면 한 번 갱신하고 한 번만 다시 보낸다"는 규칙은 같다.** 규칙을 앱에
 * 두면 앱이 둘이 될 때 둘로 갈라지고, 그때 한쪽만 고쳐지는 사고가 난다. 저장을 주입받고
 * 규칙만 여기 둔다 — 그래서 이 파일에는 테스트가 붙는다(앱에는 러너가 없다).
 *
 * ## 무엇을 고치는가 (2026-09-23 실측)
 *
 * 서버 액세스 토큰은 **15분**이고 웹에는 갱신 경로가 없었다. 로그인 15분 뒤 `/api/app/*`
 * 인증 호출이 전부 401 이 되고, 화면은 그것을 "데이터 없음"이나 "불러올 수 없습니다"로
 * 그렸다 — 코치 패널 · 관심 목록 · 포트폴리오가 동시에 죽었다. 리프레시 토큰은
 * 저장만 되고 **아무도 쓰지 않았다.**
 */

/** 401. `http/constants` 의 `HTTP_STATUS_CODE.UNAUTHORIZED` 와 같은 값이다. */
const UNAUTHORIZED = 401;

/**
 * 같은 순간에 401 이 여러 개 떠도 **갱신은 한 번만** 한다.
 *
 * 화면 하나가 인증 호출 네 개를 동시에 보낸다(코치 · 관심 목록 · 보유 · 요약). 각자
 * 갱신하면 같은 리프레시 토큰으로 네 번 발급받고, 서버가 토큰을 회전시키게 되면
 * 그중 셋이 무효가 된다. 진행 중인 약속을 공유하면 그 경합이 애초에 없다.
 */
export const singleFlight = <T>(run: () => Promise<T>): (() => Promise<T>) => {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (inFlight) return inFlight;

    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
};

export interface SessionRefreshDeps {
  /** 실제 요청을 보내는 함수 */
  fetchImpl: typeof fetch;
  /**
   * 이 요청을 **세션을 들고** 보냈는가 — 보내기 직전에 읽는다. 웹은 표지 쿠키(토큰 쿠키는 httpOnly 라 못 읽는다).
   * 로그인 없이 부른 경로의 401 은 갱신으로 풀리지 않는다.
   */
  hasSession: () => boolean;
  /**
   * 세션을 새로 받는다. 성공이면 `true` — **던지지 않는다.** 갱신 실패는 "로그인이 필요한 상태"이고 예외 경로로 다루면
   * 화면마다 처리가 갈린다. 단일 비행은 만드는 쪽에서 `singleFlight` 로 감싼다.
   */
  refreshSession: () => Promise<boolean>;
}

/**
 * 401 을 만나면 세션을 갱신하고 **한 번만** 다시 보낸다(`FE-REQ-011` FR-62 → `FE-REQ-013` FR-80 2단계).
 *
 * ## 세션을 들고 보낸 요청만 다시 보낸다
 *
 * 토큰이 httpOnly 쿠키라 요청에 `Authorization` 이 없다(1단계까지는 헤더 유무로 갈랐다). 그래서 **보낼 때 로그인 상태였나**로
 * 가른다 — 호출처가 표시하지 않아도 되고, 새 슬라이스가 갱신을 **잊을 수 없다**(`shared/api` 가 BFF 호출의 유일한 경로다).
 *
 * ## 재시도는 같은 `init` 이다
 *
 * 새 토큰은 갱신 응답이 쿠키로 심었고 브라우저가 다음 요청에 싣는다 — 헤더를 다시 만들 일이 없다.
 *
 * ## 본문은 다시 보낼 수 있는 것만
 *
 * 스트림 본문(`ReadableStream`)은 한 번 읽으면 재사용할 수 없다. 우리 mutation 은 전부 JSON 문자열이라 문제가 없다.
 */
export const withSessionRefresh = (
  deps: SessionRefreshDeps
): typeof fetch => async (input, init) => {
  const sentWithSession = deps.hasSession();
  const response = await deps.fetchImpl(input, init);
  if (response.status !== UNAUTHORIZED || !sentWithSession) return response;

  // 갱신이 안 되면 401 을 그대로 올린다. 화면이 "로그인이 필요하다"를 판단하는 근거다.
  if (!(await deps.refreshSession())) return response;
  return deps.fetchImpl(input, init);
};
