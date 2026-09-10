---
globs: salt-server/src/*/domain/**
---

# domain 레이어 — 비즈니스 로직과 도메인 모델

컨텍스트의 **핵심**이다. 나머지 세 레이어는 이걸 돕기 위해 존재한다.

## 허용 Import

- Node 표준 · `decimal.js` · `../../shared/domain/*` · `../../shared/lib/*` — 허용
- 같은 컨텍스트의 `application` · `infrastructure` · `presentation` — **금지**
- 다른 컨텍스트 — **금지 (공개 API도 포함)**. 참조는 식별자 VO로 한다
- `@prisma/client` · `express` · `axios` · `zod` — **금지** (§1)

## 구조

```
{context}/domain/
├── {Aggregate}.ts          Aggregate Root
├── {Entity}.ts             Aggregate 내부 Entity
├── {Value}.ts              VO — 식별자 · 금액 · 정책 값
├── events.ts               Domain Event (타입 + 생성 함수)
├── errors.ts               도메인 예외
├── {Name}Store.ts          Port — 영속화
├── {Name}Probe.ts          Port — 외부 능력 조회
├── policy/                 여러 Aggregate에 걸친 규칙 (Domain Service)
└── index.ts
```

## 1. 도메인은 Prisma와 프레임워크를 모른다

Prisma가 만드는 타입은 **DB row 모양**이다. 거기에 불변식을 넣을 자리가 없다. 도메인은 자기 타입을 갖고, `infrastructure`가 변환한다.

```ts
// ❌ domain/CostBasisLot.ts
import type { CostBasisLot } from '@prisma/client';   // DB 모양이 도메인이 된다

// ✅ domain/CostBasisLot.ts
export class CostBasisLot {
  private constructor(
    readonly id: LotId,
    readonly symbol: Symbol,
    private remaining: Quantity,
    readonly unitCostKrw: Money,
  ) {}

  consume(qty: Quantity): ConsumedLot {
    if (qty.gt(this.remaining)) throw new LotOverConsumedError(this.id);
    this.remaining = this.remaining.minus(qty);
    return { lotId: this.id, qty, costKrw: this.unitCostKrw.times(qty) };
  }
}
```

**유일한 예외는 `Decimal`(decimal.js)** 이다. 금액 불변식을 표현하는 타입이고 Prisma의 Decimal도 같은 구현이다.

> 이 예외를 늘리지 않는다. 다음에 인프라 타입이 도메인에 필요해지면 먼저 묻는다: **그 값이 정말 도메인 타입이어야 하는가.**

## 2. Aggregate 규칙

- **Aggregate Root만 Port를 가진다.** 내부 Entity는 Root를 통해서만 접근한다
- **불변식은 Root의 메서드 안에서 보장한다.** public setter를 열지 않는다. `readonly` + private 생성자 + 정적 팩토리
- 식별자는 원시 타입 대신 **VO**: `UserId` · `TransactionId` · `LotId` · `Symbol`
- **Aggregate 간 참조는 객체가 아니라 식별자로 한다.** 이것이 컨텍스트 결합을 끊는 실제 수단이다

## 3. 금액 불변식은 도메인이 지킨다

이 제품의 핵심 불변식이 금액에 있다.

| 불변식 | 어디서 지키는가 |
|---|---|
| 반사실 항등식 잔차 ≤ 100원 | `invoice/domain/policy/reconciliation.ts` |
| 취득가액 lot 소진량 ≤ 보유량 | `CostBasisLot.consume` |
| 솔버 매도 수량 ≤ 보유 수량 | `tax/domain/policy/harvest.ts` |
| 원화 반올림은 응답 직전 1회만 | `Money` VO가 반올림 메서드를 분리 제공 |
| 배수 0~3 범위 | `plan/domain/BandMultiplier` |
| 추천 3종 세트가 없으면 렌더 불가 | `coach/domain/policy/renderGate.ts` |

**`Money` VO를 통과하지 않는 금액이 도메인에 없어야 한다.** `number`로 금액을 들고 다니면 이 불변식이 전부 무의미해진다.

## 4. Port — 의존을 뒤집는 지점

외부 능력은 **도메인이 인터페이스로 선언하고** `infrastructure`가 구현한다.

```ts
// domain/TransactionStore.ts
export interface TransactionStore {
  findByUserInRange(userId: UserId, from: Date, to: Date): Promise<Transaction[]>;
  saveMany(txs: Transaction[]): Promise<void>;
}

// domain/PriceProbe.ts
export interface PriceProbe {
  dailyCloses(symbol: Symbol, from: Date, to: Date): Promise<DailyClose[]>;
}
```

- Port 이름은 **도메인 언어**로 짓는다. 영속화는 `*Store`, 조회 능력은 `*Probe`/`*Reader`, 발신은 `*Publisher`/`*Notifier`
- **Port 시그니처에 인프라 타입을 노출하지 않는다.** `Prisma.*`·`AxiosResponse`가 보이면 그 Port는 이미 어댑터다
- 조회 전용 Port도 도메인에 선언한다(`*Projection`) — `application`이 `infrastructure`를 import하면 훅이 막는다

## 5. Domain Event

상태 변화 중 **다른 컨텍스트가 알아야 하는 것**만 이벤트로 낸다.

- **구독자가 밖이면 `domain/`이 아니라 `application/api/`에 둔다.** 컨텍스트 밖으로 열리는 것은 `application/api`뿐이므로, `domain`의 이벤트는 다른 컨텍스트가 import 자체를 못 한다 — **아무도 받을 수 없다.**
- **이벤트에 도메인 타입을 담지 않는다.** 밖으로 나가는 것이면 식별자도 원시 문자열로 준다
- **Aggregate가 직접 발행하지 않는다** — `application`이 낸다
- 예: `LedgerImportedEvent` → `portfolio`가 보유 재계산, `invoice`가 스냅샷 무효화

## 6. 도메인 예외

`domain/errors.ts`에 정의하고 **도메인 언어로** 이름 짓는다: `LotOverConsumedError` · `ReconciliationOutOfToleranceError` · `OrderScopeNotAllowedError`.

**HTTP status를 도메인이 알지 않는다.** `shared/domain`의 기반 타입을 상속하고 `code`와 `kind`를 들고 온다. 매핑은 `presentation`이 한다.

## 7. Domain Service는 마지막 수단이다

규칙이 **여러 Aggregate에 걸쳐** 있고 어느 한쪽에 넣으면 거짓이 될 때만 만든다. `policy/` 아래 순수 함수로 둔다.

`if`가 쌓인 서비스를 Domain Service라고 부르는 것이 가장 흔한 오용이다 — 그건 Aggregate에서 새어 나온 규칙이다.

우리 정당한 `policy/` 목록: `invoice/policy/reconciliation` · `invoice/policy/biasLabel` · `tax/policy/harvest` · `tax/policy/settlementYear` · `plan/policy/band` · `coach/policy/renderGate` · `coach/policy/score`.
