/**
 * 액세스 토큰 갱신 정책 (`FE-REQ-013`).
 *
 * ## 왜 `core` 인가
 *
 * 저장은 앱마다 다르다 — 웹은 `localStorage`(쿠키로 옮기는 중), RN 은 보안 저장소다.
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

const AUTHORIZATION_HEADER = "Authorization";

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

export interface AuthRefreshDeps {
  /** 실제 요청을 보내는 함수. 앱이 목 게이트 등을 감싼 것을 넘긴다. */
  fetchImpl: typeof fetch;
  /**
   * 새 액세스 토큰을 받아 온다. 실패하면 `null` — **던지지 않는다.**
   * 갱신 실패는 "로그인이 필요한 상태"이고 예외 경로로 다루면 화면마다 처리가 갈린다.
   * 단일 비행은 이 함수를 만드는 쪽에서 `singleFlight` 로 감싼다.
   */
  refreshAccessToken: () => Promise<string | null>;
}

/**
 * 401 을 만나면 토큰을 갱신하고 **한 번만** 다시 보낸다.
 *
 * ## `Authorization` 을 실어 보낸 요청만 다시 보낸다
 *
 * 로그인 없이 부르는 공개 경로(시세 개요 등)의 401 은 갱신으로 해결되는 것이 아니다.
 * 헤더가 있었는지로 가른다 — 호출처가 따로 표시하지 않아도 되고, 그래서 새 슬라이스가
 * 갱신을 **잊을 수 없다**(`shared/api` 가 BFF 호출의 유일한 경로다).
 *
 * ## 재시도는 헤더를 다시 만든다
 *
 * 첫 요청이 들고 간 토큰은 이미 만료된 그것이다. 저장소에서 읽은 새 토큰으로 헤더를
 * 덮어써야 한다 — `init` 을 그대로 재사용하면 같은 만료 토큰을 다시 보낸다.
 *
 * ## 본문은 다시 보낼 수 있는 것만
 *
 * 스트림 본문(`ReadableStream`)은 한 번 읽으면 재사용할 수 없다. 우리 mutation 은 전부
 * JSON 문자열이라 문제가 없고, 스트림을 쓰는 날이 오면 여기서 막아야 한다.
 */
export const withAuthRefresh = (
  deps: AuthRefreshDeps
): typeof fetch => async (input, init) => {
  const response = await deps.fetchImpl(input, init);
  if (response.status !== UNAUTHORIZED) return response;

  const headers = new Headers(init?.headers);
  if (!headers.has(AUTHORIZATION_HEADER)) return response;

  const accessToken = await deps.refreshAccessToken();
  // 갱신이 안 되면 401 을 그대로 올린다. 화면이 "로그인이 필요하다"를 판단하는 근거다.
  if (!accessToken) return response;

  headers.set(AUTHORIZATION_HEADER, `Bearer ${accessToken}`);
  return deps.fetchImpl(input, { ...init, headers });
};
