---
globs: salt-server/src/*/application/**
---

# application 레이어 — 도메인을 조합해 유스케이스를 제공

**얇은 레이어**다. 흐름을 조직하고 도메인 객체를 조율하지만 **비즈니스 규칙을 갖지 않는다.**

## 허용 Import

- `../../shared/*` · 같은 컨텍스트의 `domain/*` — 허용
- 다른 컨텍스트의 `application/api/*` — **허용** (공개 API만)
- 같은/다른 컨텍스트의 `infrastructure/*` — **금지** (의존 역전)
- `presentation/*` — **금지**
- `express` · `zod` — **금지** (웹 모양이 유스케이스로 번진다)

## 구조

```
{context}/application/
├── {Verb}{Noun}.ts          Use Case 하나 = 클래스/함수 하나. 트랜잭션 경계
├── {Verb}{Noun}Command.ts   쓰기 입력 (타입)
├── {Verb}{Noun}Query.ts     읽기 입력 (타입)
├── api/                     공개 API — 밖에서 부르는 유일한 지점
│   ├── index.ts             barrel — 이것만 export 한다
│   ├── {Noun}Query.ts       interface — 다른 컨텍스트가 호출한다
│   └── {Noun}View.ts        그 응답 (도메인 타입을 담지 않는다)
└── lib/                     유스케이스 내부 헬퍼
```

## 1. 클래스 하나 = 유스케이스 하나

이름은 **동사로 시작**한다: `ImportUpbitCsv` · `RecomputeInvoiceSnapshot` · `SolveHarvestCandidates` · `GenerateCoachRecommendation` · `AnswerCoachMessage` · `CompleteWeeklyPlan`.

현재 코드는 `investment.service.ts`·`portfolio.service.ts`처럼 명사형 God 서비스다. **이관 시 동사형으로 쪼갠다.**

## 2. 서비스는 조합만 한다

**도메인 규칙을 서비스에 쓰지 않는다.** 판정·계산은 Aggregate 또는 `domain/policy/`에 있다.

```ts
export class RecomputeInvoiceSnapshot {
  constructor(
    private readonly txStore: TransactionStore,      // domain Port
    private readonly cashFlowStore: CashFlowStore,   // domain Port
    private readonly priceProbe: PriceProbe,         // domain Port
    private readonly snapshotStore: SnapshotStore,
    private readonly events: EventBus,
  ) {}

  async execute(cmd: RecomputeInvoiceCommand): Promise<InvoiceSnapshotId> {
    const [txs, flows] = await Promise.all([...]);            // 짧은 읽기
    const prices = await this.priceProbe.dailyCloses(...);     // 트랜잭션 밖
    const snapshot = InvoiceSnapshot.compute(txs, flows, prices); // 규칙은 도메인
    const saved = await this.snapshotStore.save(snapshot);      // 짧은 쓰기
    this.events.publish(invoiceRecomputed(saved.id.value));
    return saved.id;
  }
}
```

**생성자에 들어오는 타입이 전부 `domain`의 Port거나 `shared`여야 한다.** `PrismaTransactionStore`가 보이면 의존 역전이 깨진 것이고 훅이 막는다.

## 3. 트랜잭션은 이 레이어에만

- `prisma.$transaction`은 **`application`에서만** 호출한다. 도메인·컨트롤러·어댑터에서 열지 않는다
- 조회 전용 유스케이스는 트랜잭션을 열지 않는다
- **외부 I/O를 트랜잭션 안에 넣지 않는다.** LLM 호출(수 초~수십 초) · 거래소 API · 환율 조회 · 지표 수집이 커넥션과 락을 잡으면 서버가 멈춘다
- 패턴: **트랜잭션 밖에서 외부 호출 → 결과를 들고 짧은 트랜잭션으로 저장**

Port에 긴 외부 호출이 있으면 **Port 이름과 주석에 "트랜잭션 밖에서 호출"을 명시**한다. 어댑터는 자기가 트랜잭션 안인지 알 수 없다.

## 4. 입력은 Command / Query 타입으로

웹 DTO를 그대로 받지 않는다. `presentation`이 변환한다.

```ts
export type RecomputeInvoiceCommand = { userId: UserId; window: InvoiceWindow };
```

이유: **같은 유스케이스를 HTTP와 워커가 모두 부른다.** 반사실 스냅샷은 월요일 09:00 워커가 부르고 사용자 재계산 요청도 부른다.

## 5. Domain Event — 발행과 수신 둘 다 여기서

- 발행은 **커밋 이후**에 한다. 트랜잭션이 롤백되면 후속 처리도 일어나지 않아야 한다
- 핸들러는 **얇게** 유지하고 실제 작업은 자기 컨텍스트의 유스케이스에 위임한다
- 이벤트 버스는 `shared/infrastructure`의 인프로세스 구현. 브로커를 두지 않는다

## 6. 공개 API — 컨텍스트 밖으로 열리는 유일한 문

```ts
// tax/application/api/CostBasisQuery.ts
export interface CostBasisQuery {
  forSymbol(userId: string, assetType: string, symbol: string): Promise<CostBasisView | null>;
}

// tax/application/api/CostBasisView.ts — 도메인 타입을 담지 않는다
export type CostBasisView = {
  movingAverage: { unitCostKrw: string; totalKrw: string };
  fifo: { unitCostKrw: string; totalKrw: string };
};
```

- 구현은 같은 컨텍스트의 서비스가 한다. `api/`는 **계약만** 갖는다
- `View`에 Aggregate·VO를 담지 않는다. 담으면 도메인 리팩터가 다른 컨텍스트의 컴파일 에러가 된다
- **금액은 문자열로 준다.** `Decimal`을 경계 밖으로 내보내면 수신자가 우리 타입에 묶이고, `number`로 바꾸면 정밀도를 잃는다
- **열거값을 자유 문자열로 받지 않는다.** 받아야 하면 유효값의 출처를 주석으로 가리킨다
- 공개 API를 늘리기 전에 묻는다: **이벤트로 알리면 되는 일인가?** 조회가 아니라 통보라면 Domain Event가 맞다

## 7. 조합 컨텍스트

`homebriefing` · `onboarding`은 Aggregate가 없고 `application`(+`presentation`)만 있다.

- **비즈니스 규칙을 담지 않는다.** 순서와 조합만 한다
- 트랜잭션을 다시 열지 않는 것이 기본이다. 각 유스케이스가 자기 트랜잭션을 갖는다
- **부분 실패를 설계한다.** 홈 조립 중 청구서 스냅샷 조회가 실패해도 총자산·적립·D-Day는 내려준다 (F006 FR-5)
- 조합 자체의 규칙(`ONBOARDING_NO_LEDGER`)이 필요하면 던지는 유스케이스 옆에 두고 왜 여기인지 주석을 남긴다. 빈 `domain` 디렉터리를 만들지 않는다
