---
globs: salt-server/src/*/infrastructure/**
---

# infrastructure 레이어 — 외부 시스템 연동

`domain`이 선언한 Port를 **구현하는 곳**이다. Prisma · 거래소 API · 환율 · LLM · 지표 소스가 여기 산다.

## 허용 Import

- `../../shared/*` · 같은 컨텍스트의 `domain/*` — 허용
- 다른 컨텍스트의 `application/api/*` — **허용** (ACL 어댑터를 만들 때만)
- 같은 컨텍스트의 `application/*` · `presentation/*` — **금지**
- `@prisma/client` · `axios` · 외부 SDK — **허용** (여기가 그 자리다)

## 구조

```
{context}/infrastructure/
├── Prisma{Name}Store.ts        domain 의 *Store Port 구현
├── Prisma{Name}Projection.ts   읽기 전용 조회 구현
├── {External}Client.ts         거래소 · 환율 · LLM · 지표 클라이언트
├── {가져오는것}Adapter.ts       다른 컨텍스트를 우리 Port 로 번역하는 ACL
├── mappers/                    Prisma row ↔ 도메인 변환
└── index.ts                    비어 있거나 DI 등록만. Store 를 export 하지 않는다
```

## 1. 어댑터를 밖으로 export하지 않는다

```ts
// ✅ 파일 안에만 존재하고 DI 등록 함수만 노출
class PrismaTransactionStore implements TransactionStore { /* ... */ }
export const registerLedgerInfra = (c: Container) => c.bind('TransactionStore', new PrismaTransactionStore(prisma));
```

`index.ts`에서 Store 클래스를 export하면 `application`이 실수로 구현체를 잡을 수 있게 되고, 그때 훅이 막지만 **애초에 보이지 않게 하는 것이 낫다.**

## 2. 매핑은 여기서 한다

Prisma row는 DB 모양이고 도메인 타입은 불변식을 가진 모델이다. 변환을 `mappers/`에 모은다.

```ts
// mappers/transaction.ts
export const toDomain = (row: PrismaTransaction): Transaction =>
  Transaction.rehydrate({
    id: TransactionId.of(row.id),
    symbol: Symbol.of(row.symbol),
    quantity: Quantity.of(row.quantity),          // Float → Decimal 승격
    priceKrw: Money.krw(row.price),
    settlementDate: row.settlementDate ?? row.transactionDate,
  });
```

- **`Float` 컬럼을 읽을 때 `Decimal`로 승격한다.** 기존 원장 컬럼이 `Float`이고 그것을 바꾸는 것은 별도 마이그레이션이다. 계산 경로가 오염되지 않게 여기서 막는다
- `settlementDate`가 null인 크립토 row는 `transactionDate`로 대체한다. 그 규칙을 매퍼 한 곳에만 둔다

## 3. 조회는 Aggregate를 로드하지 않는다

목록·통계 화면은 **Projection**을 쓴다. Aggregate 전체를 로드해 DTO로 매핑하면 필요 없는 연관까지 끌고 온다.

```ts
// ❌ 거래 5,000건을 로드해서 합계만 쓴다
const txs = await txStore.findByUserInRange(userId, from, to);
const total = txs.reduce(...);

// ✅ 화면 모양에 맞춘 읽기 전용 쿼리
const total = await feeProjection.sumFeeInRange(userId, from, to);
```

**조회 계약도 `domain`에 Port로 선언한다.** `application`이 `infrastructure`의 인터페이스를 import하면 의존 역전이 깨진다(훅이 막는다). 이름을 `*Projection`으로 두어 "규칙이 아니라 조회"임을 드러낸다.

## 4. N+1과 쿼리 수

- Prisma의 `include`는 관계를 한 번에 가져온다. **루프 안에서 `findUnique`를 부르지 않는다**
- 컬렉션 두 개를 동시에 `include`하면 결과가 곱해진다. 두 번 쿼리하거나 `in` 조회로 나눈다
- 개발에서 `log: ['query']`로 **쿼리 수를 눈으로 확인한다.** 화면 하나에 쿼리 20개면 설계 문제다
- 상세는 `performance-database.md`

## 5. ACL — 다른 컨텍스트를 우리 언어로 번역한다

기준: **그 컨텍스트의 모양이 우리 유스케이스에 새어 들어오는가.**

```ts
// invoice/domain/CostBasisSource.ts        — 우리 언어로 선언한 Port
export interface CostBasisSource {
  unitCostKrw(symbol: Symbol): Promise<Money | null>;
}

// invoice/infrastructure/CostBasisAdapter.ts — 남의 모양을 우리 모양으로
class CostBasisAdapter implements CostBasisSource {
  constructor(private readonly query: CostBasisQuery) {}   // tax/application/api
  async unitCostKrw(symbol: Symbol) {
    const view = await this.query.forSymbol(this.userId, 'crypto', symbol.value);
    return view ? Money.krw(view.movingAverage.unitCostKrw) : null;
  }
}
```

**이름에 컨텍스트를 쓰지 않는다.** `TaxContextAdapter`로 지으면 같은 컨텍스트를 감싸는 ACL이 여럿일 때 이름이 겹친다. **무엇을 감싸는지가 아니라 무엇을 가져오는지**를 쓴다.

## 6. 외부 클라이언트 — 이 제품의 실제 목록

| 클라이언트 | 컨텍스트 | 규칙 |
|---|---|---|
| Upbit REST/WS | `market` `ledger` | **조회 전용 키만.** 주문·출금 엔드포인트를 호출하는 코드를 만들지 않는다 |
| KIS (한국투자증권) | `ledger` `market` | 동일. 잔고·체결내역 GET만 |
| 환율 소스 | `fx` | 결제일 기준환율. 결측 시 `degraded` |
| 온체인 지표 (MVRV Z · Puell) | `indicator` | 일 1회. carry-forward + `staleDays` |
| CAPE | `indicator` | 동일 |
| Binance | `plan` | 김프 계산용 가격만 |
| Gemini (LLM) | `coach` | **문장만 생성. 숫자는 주입한다.** 프롬프트·응답을 원문 로깅하지 않는다 |
| 뉴스 소스 | `news` | 크롤링 주기 준수 |

- **주문·출금 API를 부르는 코드를 어떤 이유로도 만들지 않는다.** 전 영역 공통 수용 기준이다
- 거래소 키는 암호문만 저장한다. 응답·로그에 평문이 없어야 한다
- 외부 호출에 타임아웃과 재시도 상한을 준다. 재시도는 지수 백오프 3회

## 7. 트랜잭션을 열지 않는다

`prisma.$transaction`은 `application`의 것이다. 어댑터가 자기 트랜잭션을 열면 유스케이스의 경계가 둘로 쪼개진다.

## 8. 횡단 인프라는 `shared/infrastructure`

Prisma client 인스턴스 · HTTP 클라이언트 팩토리 · 이벤트 버스 · 스케줄러는 `shared/infrastructure`에 둔다. `ledger/infrastructure/prisma.ts`가 생기면 그건 `shared`의 것이다.
