# BFF 아키텍처 — 화면 계약의 소유자

BFF는 프록시가 아니다. **프론트 화면이 쓰는 뷰모델을 소유하는 레이어**다. 서버는 도메인 계약을 주고, BFF가 그것을 화면 모양으로 조립한다.

```
bff/src/
├── rest/
│   ├── routes/        path · 미들웨어 연결만
│   ├── controllers/   요청 파싱 · 서비스 호출 · 응답 변환
│   ├── middleware/    auth · error
│   └── app.ts
├── services/          backend aggregation · 뷰모델 구성 · 외부 API
├── websocket/         실시간 시세 구독 (managers · handlers)
├── workers/           가격 갱신
├── builder/           캔들 조립
├── config/ types/ utils/
```

## 1. 의존 방향

```
routes → controllers → services
```

- **라우터는 path와 middleware 연결만** 한다
- **컨트롤러는 요청 파싱 · 서비스 호출 · 응답 변환만** 한다. 조립 로직을 두지 않는다
- **서비스가 뷰모델을 만든다.** 여러 서버 엔드포인트를 조합하고, 실패를 격리하고, 계산 결과를 화면 필드로 옮긴다

컨트롤러에서 서버를 두 번 부르고 있으면 그 조합은 서비스의 일이다.

## 2. BFF가 소유하는 것과 소유하지 않는 것

| BFF가 한다 | BFF가 하지 않는다 |
|---|---|
| 여러 서버 엔드포인트 조합 | **금액 계산** — 서버가 한다 |
| 부분 실패 격리 (`allSettled`) | 도메인 규칙 판정 |
| 화면 필드명으로 이름 바꾸기 | 세율·공제·임계값 하드코딩 |
| 실시간 가격으로 스냅샷 보정 | 새로운 비즈니스 상태 생성 |
| LLM 문장 요청 중계 | LLM에게 숫자 계산 요청 |
| SSE 스트림 중계 | 원장·스냅샷 저장 |

**BFF에 `if` 분기로 금액이 바뀌는 코드가 생기면 그건 서버 계약이 부족하다는 신호다.** 서버에 필드를 추가한다.

## 3. 뷰모델은 BFF가 소유한 계약이다

- 프론트가 자기 이름으로 타입을 다시 정의하지 않는다. `packages/core`에서 공유한다
- 뷰모델 shape 변경은 **프론트 영향**이다. `salt-microFe/**` 확인이 필요하다
- 서버 호출 path/request/response 변경은 **서버 영향**이다. `salt-server/**` 확인이 필요하다

## 4. 웹은 블록별, 모바일은 1콜 — 두 형태를 같은 함수에서 만든다

App Router RSC는 서버 컴포넌트가 블록별로 병렬 호출한다. **RN에는 RSC가 없으므로 집계 1콜이 필요하다.**

```ts
// services/app-home.service.ts
export const homeBlocks = {
  totalAsset: (t: string) => /* ... */,
  weeklyPlan:  (t: string) => /* ... */,
  coach:       (t: string) => /* ... */,
  taxDeadline: (t: string) => /* ... */,
  invoice:     (t: string) => /* ... */,
};

// 집계 엔드포인트는 블록 함수를 묶은 얇은 껍데기다
export const getHome = async (t: string) => {
  const r = await Promise.allSettled(Object.values(homeBlocks).map((f) => f(t)));
  return assembleWithStatus(r);   // 실패한 블록은 status: 'unavailable'
};
```

| 소비자 | 엔드포인트 |
|---|---|
| `apps/web` | `GET /api/app/home/total-asset` 등 **블록별** |
| `apps/mobile` | `GET /api/app/home` **집계 1콜** |

뷰모델 정의는 한 곳에 남는다. **계약을 두 번 만들지 않는다.**

## 5. 부분 실패 격리

- 조합 응답은 **`Promise.allSettled`** 를 쓴다. `Promise.all`은 하나가 실패하면 전부 버린다
- 블록별 `status: 'ok' | 'unavailable'`과 `degradedBlocks[]`를 준다
- **금액 블록이 실패하면 0을 내려보내지 않는다.** `null` + `status: 'unavailable'`이다. 0은 "잔액이 0원"으로 읽힌다
- 서버가 `degraded: true`를 주면 **그것을 지우지 않고 전달**한다. 잔차·결측을 숨기지 않는다

## 6. 인증

- 토큰을 서버에 그대로 전달한다. BFF가 토큰을 해석하지 않는다
- **응답에 토큰·거래소 키·계좌 식별자를 담지 않는다**
- 웹이 쿠키 기반으로 옮기면 BFF가 쿠키 → Authorization 변환을 담당한다

## 7. 동면 경로

등록 해제된 경로는 404가 아니라 **410 Gone + 1회 로그**로 1주 유지해 프론트 잔여 호출을 탐지한다. 대상: `/api/app/feed` · `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard`.

## 8. WebSocket

- 시세 구독은 유지한다. `ws://…:4002`
- worker는 **직접 실행될 때만** 주기 작업을 시작한다. import side effect로 interval·socket·shutdown hook이 중복 생성되지 않게 한다
- 구독 정책(`limit=100`)은 변경 금지 목록이다

## 9. 하지 않는 것

- **주문·출금 API를 중계하지 않는다.** 서버에 그 경로가 없고 BFF에도 만들지 않는다
- **BFF에 DB를 붙이지 않는다.** 상태가 필요하면 서버에 둔다
- Route Handler와 BFF를 둘 다 쓰지 않는다. 프론트 Route Handler는 세션 쿠키 갱신·업로드 프록시로 한정한다
