/**
 * 네트워크 정책 상수.
 *
 * 플랫폼 무관한 값(재시도 횟수·타임아웃·상태 코드)은 `@repo/core/http` 가 소유한다.
 * 두 zone 과 RN 이 같은 값을 봐야 하므로 앱 안에 복사본을 두지 않고 re-export 한다.
 */
export { NETWORK, HTTP_STATUS_CODE } from "@repo/core/http";

/** WebSocket 재연결 대기(ms). 이 zone 의 실시간 테이블에서만 쓴다. */
export const RECONNECT_TIME_PENDING = 3000;
