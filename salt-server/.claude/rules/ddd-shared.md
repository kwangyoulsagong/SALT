---
globs: salt-server/src/shared/**
---

# shared — Shared Kernel + 횡단 인프라

컨텍스트가 아니다. **모든 컨텍스트가 같은 의미로 쓴다고 합의한 것**만 들어온다.

## 허용 Import

- Node 표준 · 외부 라이브러리 — 허용
- **아무 컨텍스트도 import할 수 없다** (훅이 차단)

## 구조

```
shared/
├── domain/           전 컨텍스트 공용 VO · enum · 예외 기반 타입
├── infrastructure/   Prisma client · HTTP 클라이언트 팩토리 · 이벤트 버스 · 스케줄러
├── presentation/     전역 에러 미들웨어 · 공용 응답 유틸 · 헬스체크
├── config/           env · logger · swagger
└── lib/              순수 유틸 (금액 · 날짜 · 해시)
```

## 1. Shared Kernel은 작게 유지한다

- **여기에 들어온 타입은 모든 컨텍스트가 같은 의미로 쓴다는 합의다.** 합의가 없으면 넣지 않는다
- 판단 기준: **"이 타입의 의미를 바꾸려면 몇 개 컨텍스트와 합의해야 하는가?"** 둘 이상이면 kernel이 맞다
- 도메인 특화 로직 금지. `shared/lib/calculateHarvest.ts`가 생기면 그건 `tax/domain/policy/`의 것이다

### 여기 있는 것 (합의된 것)

| 타입 | 왜 커널인가 |
|---|---|
| `Money` | 금액 불변식과 반올림 규칙을 전 컨텍스트가 같게 써야 한다. **이것이 이 제품에서 가장 중요한 커널 타입이다** |
| `Quantity` | 수량 정밀도 8자리 |
| `UserId` | 전 컨텍스트가 참조한다 |
| `Symbol` | 종목 식별자. 대문자 정규화 규칙 포함 |
| `AssetType` | `crypto` · `kr_stock` · `us_stock`. 세 컨텍스트 이상이 분기한다 |
| `KstDate` | **세금 기준일이 tz 경계를 갖는다.** 12/30과 12/31의 차이가 250만원 공제 한 해분이다 |
| `DomainError` · `ErrorKind` | 전역 에러 미들웨어가 성립하는 근거 (§2) |
| `Degraded` | 계산 불완전 상태 표현. 청구서·세금·적립이 공유한다 |

## 2. 도메인 예외 기반 타입 — 전역 미들웨어가 성립하는 이유

전역 에러 미들웨어는 `shared/presentation`에 하나만 둔다. 그런데 그것이 컨텍스트별 예외를 import하면 훅이 막는다 — shared는 컨텍스트를 모른다.

**해법: 컨텍스트 도메인 예외가 `shared/domain`의 기반 타입을 상속하고 `code`를 들고 온다.**

```ts
// shared/domain/DomainError.ts
export type ErrorKind = 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'BLOCKED';

export abstract class DomainError extends Error {
  constructor(readonly code: string, readonly kind: ErrorKind, message: string) { super(message); }
}
```

- `ErrorKind` → HTTP status 매핑은 미들웨어가 **한 번만** 한다
- **도메인이 HTTP status를 알지 않는다** — `ErrorKind`는 의미 분류이고, 그것을 404/409/400으로 옮기는 것은 `presentation`의 판단이다

## 3. `Money` — 이 제품의 핵심 커널

금액 규칙을 한 곳에 둔다.

```ts
export class Money {
  private constructor(private readonly amount: Decimal, readonly currency: Currency) {}
  static krw(v: Decimal.Value): Money;
  plus(o: Money): Money;          // 통화가 다르면 던진다
  times(q: Quantity): Money;
  /** 응답 직전 1회만 호출한다. DB 저장 값에는 쓰지 않는다. */
  toKrwInteger(): number;
}
```

- **중간 반올림 금지.** `toKrwInteger()`는 `presentation`에서만 부른다
- 통화가 다른 금액의 연산은 예외를 던진다. 미국주식이 들어오면서 실제 위험이 된다
- 절사/반올림 방식은 설정값이다(`TaxLawConfig`). 커널이 하드코딩하지 않는다

## 4. `shared/infrastructure` — 컨텍스트에 속하지 않는 인프라만

Prisma client 단일 인스턴스 · HTTP 클라이언트 팩토리(타임아웃·재시도 기본값) · 인프로세스 이벤트 버스 · cron 스케줄러 등록.

`ledger/infrastructure/prisma.ts`가 생기면 그건 `shared`의 것이다.

## 5. `shared/presentation`에 둘 수 있는 라우터

**서버 자신의 상태**를 답하는 것만 둔다 — 도메인이 없기 때문이다.

- `GET /health` — 기존 유지
- Swagger UI

그 외 라우터가 여기 생기면 그건 컨텍스트를 못 찾은 것이다.

## 6. `shared/lib` — 순수 함수만

날짜 경계(KST 주차·영업일 판정 보조) · 해시 · 문자열 정규화. **도메인 판정을 두지 않는다.**

`isSettlementInTaxYear()`처럼 보이는 함수는 `tax/domain/policy/settlementYear.ts`의 것이다.
