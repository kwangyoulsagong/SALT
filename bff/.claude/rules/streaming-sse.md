# SSE 스트리밍 — 코치 대화가 흐르는 경로

코치 대화는 LLM 토큰을 흘려보낸다. 제품의 핵심이므로 이 경로의 규칙을 못 박는다.

## 1. 왜 SSE인가

| 후보 | 판단 |
|---|---|
| **SSE** | **채택.** 단방향 서버→클라이언트, HTTP 위에서 동작, 자동 재연결, 프록시 친화 |
| WebSocket | 이미 시세용으로 쓴다. 대화까지 얹으면 한 소켓에 성질이 다른 두 스트림이 섞이고, 재연결 정책이 충돌한다 |
| 폴링 | 토큰 단위 스트리밍이 안 된다. 첫 토큰 1s 예산을 못 지킨다 |
| 스트리밍 SSR | 첫 페인트 이후 계속 흐르는 것은 SSR의 일이 아니다 |

**시세는 WebSocket, 대화는 SSE.** 두 스트림을 섞지 않는다.

## 2. 경로

```
apps/web · apps/mobile  ──SSE──▶  BFF  ──SSE──▶  salt-server  ──▶  LLM
```

BFF는 **중계자**다. 토큰을 저장하거나 변형하지 않는다. 다만 이벤트 이름과 페이로드를 **화면 계약으로 정규화**한다.

## 3. 이벤트 계약

```
event: message.start     data: { "messageId": "...", "createdAt": "..." }
event: message.delta     data: { "text": "부분 문자열" }
event: message.card      data: { ...RecommendationCardViewModel }
event: message.done      data: { "messageId": "...", "tokenCount": 123 }
event: message.error     data: { "code": "LLM_TIMEOUT", "fallback": "rule" }
event: ping              data: {}
```

- `delta`는 **문자열 조각만** 담는다. 마크다운 파싱은 클라이언트가 한다
- **추천 카드는 `delta`로 흘리지 않는다.** `message.card`로 완성된 객체를 한 번에 준다 — 3종 세트 렌더 게이트(`renderable`)가 부분 상태에서 판정되면 안 된다
- `message.error`가 오면 클라이언트는 **규칙 기반 문장으로 폴백**하고 배지를 표시한다. 대화가 죽지 않는다

## 4. 취소 전파 — 안 하면 유령 호출이 된다

클라이언트가 화면을 떠나거나 중단하면 **LLM 호출까지 취소**되어야 한다.

```ts
req.on('close', () => { upstream.destroy(); controller.abort(); });
```

- BFF는 클라이언트 연결 종료를 **서버로 전파**한다
- 서버는 그 신호로 LLM 호출을 `AbortController`로 끊는다
- 취소하지 않으면 사용자 ≤10명인 서버에서 유령 호출이 CPU와 LLM 비용을 먹는다

## 5. 하트비트와 프록시

- **주기적으로 `ping`을 보낸다**(15초). 프록시와 로드밸런서가 유휴 연결을 끊는다
- `Cache-Control: no-cache` · `Connection: keep-alive` · **`X-Accel-Buffering: no`** 를 설정한다. nginx가 버퍼링하면 스트리밍이 사라진다
- 압축을 끈다. gzip 버퍼링이 토큰을 모아 버린다

## 6. 재연결

- SSE는 자동 재연결한다. **그래서 같은 메시지가 두 번 생성될 수 있다**
- `Last-Event-ID`를 쓰거나, 서버가 `messageId`로 멱등을 보장한다
- **재연결 시 LLM을 다시 부르지 않는다.** 이미 생성된 메시지를 이어서 보낸다. 안 그러면 비용이 두 배가 되고 답이 달라진다

## 7. 성능 예산

| 지점 | 예산 |
|---|---|
| 첫 토큰 도착 | 1s |
| `delta` 간격 | 프록시 버퍼링 없이 즉시 |
| 하트비트 | 15초 |
| 동시 스트림 | 사용자 ≤10명 × 1 = 실질 10 이하 |
| 대화당 최대 시간 | 60s (초과 시 `message.error`) |

## 8. 보안과 로깅

- **프롬프트와 응답을 원문 로깅하지 않는다.** 토큰 수와 지연만 남긴다
- LLM 프롬프트에 **계좌 식별자·거래소 키를 넣지 않는다.** 금액은 필요한 범위만
- **숫자는 서버가 계산해서 프롬프트에 주입한다.** LLM이 금액을 만들지 않는다
- 스트림에 `disclaimer`를 포함해 화면이 면책을 항상 렌더할 수 있게 한다

## 9. 모바일 주의사항

- 앱이 백그라운드로 가면 연결이 끊긴다. **재연결 시 §6의 멱등 규칙**이 적용된다
- 토큰을 매번 setState하면 JS 스레드가 막힌다. **프레임 단위로 버퍼링**한다(`performance-rn.md` §4)
- 오프라인이면 스트림을 시작하지 않고 입력을 보존한다
