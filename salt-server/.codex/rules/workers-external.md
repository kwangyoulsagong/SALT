# Workers/External 연동 규칙

## Workers

- 장기 실행 또는 주기 작업은 `src/workers/**`에 둔다.
- worker는 시작/중지 흐름과 에러 로그를 명확히 둔다.
- 서버 부팅 시 자동 시작되는 worker는 `src/app.ts` 등록 위치와 실행 주기를 확인한다.
- 중복 실행이 위험한 작업은 idempotent하게 작성하거나 lock/upsert 전략을 둔다.
- 반복 작업은 실패해도 프로세스를 즉시 죽이지 말고 다음 실행 가능성을 남긴다.

## 외부 API

- 외부 API client/service는 `src/external/**` 또는 도메인 service 내부에 격리한다.
- API base URL, key, timeout 등은 env/config를 통해 주입한다.
- 외부 응답은 내부 DTO/도메인 모델로 변환한 뒤 service에 전달한다.
- 외부 API 실패, rate limit, timeout을 고려해 fallback 또는 재시도 정책을 명시한다.
- 외부 원문 응답 전체를 그대로 DB나 API 응답에 노출하지 않는다.

## WebSocket/시세

- WebSocket client는 연결, 재연결, 종료, message parse 실패를 각각 처리한다.
- 시세 업데이트는 DB write 빈도와 중복 업데이트 비용을 고려한다.
- 숫자/Decimal 변환은 한 곳에서 명확히 처리한다.

## 로깅

- worker와 external service는 `src/config/logger.ts`를 사용한다.
- 로그에는 job 이름, 대상 symbol/id, 실패 원인을 포함한다.
- secret, token, credential은 로그에 남기지 않는다.
