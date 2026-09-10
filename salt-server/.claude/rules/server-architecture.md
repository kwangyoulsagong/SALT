# 서버 아키텍처 — 컨텍스트 우선 DDD (Express + TypeScript + Prisma)

**Bounded Context가 최상위 디렉터리이고, 그 안에 표준 DDD 4층이 들어간다.** DDD가 컨텍스트 이름을 주고, 레이어드 아키텍처가 그 안의 레이어 이름을 준다.

```
salt-server/src/
├── server.ts · app.ts                    진입점 · 라우터 등록
├── shared/                               Shared Kernel + 횡단 인프라
│   ├── domain/                           전 컨텍스트 공용 VO · enum · 예외 기반 타입
│   ├── infrastructure/                   Prisma client · HTTP 클라이언트 팩토리 · 이벤트 버스
│   ├── presentation/                     전역 에러 미들웨어 · 공용 응답 유틸 · 헬스체크
│   ├── config/                           env · logger · swagger
│   └── lib/                              순수 유틸 (금액 · 날짜 · 해시)
└── {context}/                            Bounded Context (§2 레지스트리)
    ├── domain/                           Aggregate · Entity · VO · Domain Event · Port
    ├── application/                      Use Case · 트랜잭션 경계 · 프로세스 조합
    │   └── api/                          이 컨텍스트의 공개 API — 밖에서 부르는 유일한 지점
    ├── infrastructure/                   Port 구현 — Prisma · 외부 클라이언트 · Projection · ACL
    └── presentation/                     Express 라우터 · 컨트롤러 · Zod DTO
```

| 레이어 | 역할 | 문서 |
|---|---|---|
| `shared` | Shared Kernel — 모든 컨텍스트가 같은 의미로 쓰는 것만 | `ddd-shared.md` |
| `domain` | 비즈니스 로직과 도메인 모델. **핵심** | `ddd-domain.md` |
| `application` | 도메인을 조합해 유스케이스 제공. 트랜잭션 경계 | `ddd-application.md` |
| `infrastructure` | 외부 시스템(DB · HTTP · 거래소 · LLM) 연동 | `ddd-infrastructure.md` |
| `presentation` | 요청 처리와 응답 | `ddd-presentation.md` |

## 1. 의존 방향 — 훅이 강제한다

```
presentation → application → domain ← infrastructure
```

**선형이 아니다.** `application`과 `infrastructure`는 둘 다 `domain`에 의존하고 **서로에게는 의존하지 않는다.** `application`이 DB를 쓰는 방법은 `domain`이 선언한 Port를 받는 것이고, 그 구현이 `infrastructure`에 있다는 사실을 모른다.

`.claude/hooks/layer-check.mjs`가 쓰기 시점에 exit 2로 막는 것:

| 금지 | 왜 |
|---|---|
| `domain` → `application` · `infrastructure` · `presentation` | 도메인이 자기 밖을 알면 단독으로 추론·테스트할 수 없다 |
| `domain` → `@prisma/client` · `express` · `axios` | 프레임워크와 DB 모양이 도메인으로 번진다 (§3) |
| `application` → `infrastructure` | 의존 역전 위반. Port를 `domain`에 두고 뒤집는다 |
| `presentation` → `infrastructure` | 컨트롤러가 리포지토리를 직접 잡는다 |
| `shared` → 아무 컨텍스트 | Shared Kernel이 특정 도메인을 알면 커널이 아니다 |
| 컨텍스트 → 다른 컨텍스트 (`application/api` 제외) | 경계가 이름만 남는다 |

## 2. 컨텍스트 레지스트리

이름은 프론트 FSD 슬라이스와 **동일**하다(`salt-microFe/.claude/rules/layered-architecture.md` §4). 새 컨텍스트는 이 표에 먼저 추가한다.

| 컨텍스트 | 책임 | 근거 기능 |
|---|---|---|
| `auth` | 초대 코드 검증 · 세션 · 토큰 발급/갱신 | F000 |
| `ledger` | 거래 원장 · CSV import · 거래소 조회 키 · 원장 건강도 | F001 |
| `portfolio` | 보유 재계산 · 평가 · 3자산군 합산 | F001 F006 |
| `market` | 시세 동기화 · 관심 종목 · 차트 · 기술 지표 | F000 |
| `coach` | 점수 엔진 · 추천 · 근거 3종 조립 · 대화 · 성적표 · 피드백 | F004 F006 |
| `invoice` | 반사실 3트랙 · 거래별 귀속 · 편향 라벨 · 항등식 검증 | F001 |
| `tax` | 취득가액 lot · 손실수확 솔버 · 환율 함정 · 스텝업 · 결제 캘린더 · 증빙 | F002 |
| `plan` | 밸류에이션 밴드 · 주간 계획 · 김프 · 실행 기록 | F003 |
| `indicator` | 지표 수집·스냅샷 · **실패 이력** | F003 F004 |
| `fx` | 환율 원장 · 결제일 기준환율 | F001 F002 |
| `goal` | 목표 저축 | F000 |
| `news` | 뉴스 수집·조회 | F000 |
| `notification` | 알림 2종 (세금 D-Day · 지표/추천 갱신) | F000 F002 |
| `device` | 디바이스 등록 · 푸시 발송 · 앱 버전 게이트 | F007 |

### 조합 컨텍스트

여러 컨텍스트를 엮는 화면·플로우는 **자기 컨텍스트를 갖는다.** Aggregate가 없고 `application`(+`presentation`)만 있으며, 남의 컨텍스트를 **공개 API로만** 부른다.

| 컨텍스트 | 엮는 것 | 근거 |
|---|---|---|
| `homebriefing` | portfolio + plan + coach + tax + invoice | F006 홈 5블록 |
| `onboarding` | auth + ledger + plan | F000 3스텝 |

**조립이 행을 남기면 그 행의 주인을 먼저 찾는다.** 조합 컨텍스트에 Aggregate를 두려면 `domain`이 필요해지고, 그건 "Aggregate가 없다"는 전제를 되돌리는 것이다.

## 3. Prisma를 도메인에 들이지 않는다 — DevAtlas와 다른 선택

DevAtlas는 JPA 엔티티와 Aggregate를 겸하게 했다(`jakarta.persistence`를 도메인에 허용). 우리는 그러지 않는다. 이유:

- **Prisma는 클래스를 만들지 않는다.** 생성된 타입은 DB row 모양의 구조적 타입이고 거기에 불변식을 넣을 자리가 없다. 겸하게 하면 도메인이 그냥 없어진다.
- 그런데 매핑 비용이 싸다. Prisma 타입은 구조적이라 **infrastructure에서 평범한 함수로 변환**된다. Java의 매퍼 보일러플레이트가 없다.
- 기존 코드가 이미 `payload` JSON을 조건으로 뒤지고 `Float`로 금액을 다룬다. **그 모양이 도메인으로 새어 들어오는 것을 막는 것**이 이 전환의 목적 중 하나다.

허용되는 예외는 하나: **`Decimal`(decimal.js)** 을 도메인에서 쓴다. 금액 불변식을 표현하는 타입이고 Prisma의 Decimal도 같은 구현이다.

## 4. 컨텍스트 간 연동 — 공개 API 하나만

```ts
// ❌ 남의 Aggregate·리포지토리·컨트롤러
import { CostBasisLot } from '../tax/domain/CostBasisLot';
import { PrismaLotStore } from '../tax/infrastructure/PrismaLotStore';

// ✅ 그 컨텍스트가 공개한 것만
import type { CostBasisQuery, CostBasisView } from '../tax/application/api';
```

- 공개 API를 부를 수 있는 것은 **`application`과 `infrastructure`뿐**이다. `presentation`이 남의 컨텍스트를 부르고 있으면 그 조합은 조합 컨텍스트의 일이다.
- 번역이 필요하면 소비하는 쪽 `domain`에 Port를 두고 `infrastructure`에 **ACL 어댑터**를 만든다.
- 상태 변화 전파는 **Domain Event**로 한다. 단일 프로세스이므로 브로커를 두지 않는다.
- **barrel `index.ts`가 Java 가시성을 대신한다.** 컨텍스트 밖에서 쓰는 것은 `{context}/application/api/index.ts`에만 export한다.

## 5. 클래스 하나 = 유스케이스 하나

`application`의 서비스는 **동사로 시작하는 이름**을 갖고 하나의 유스케이스만 담는다. `TaxService`처럼 명사로 지으면 유스케이스가 계속 붙어 God 클래스가 된다.

현재 코드가 정확히 그 상태다 — `investment.service.ts`, `portfolio.service.ts`가 여러 유스케이스를 담고 있다. 이관 시 **동사형으로 쪼갠다**.

## 6. 워커

`src/workers/**`는 유지하되 **유스케이스를 직접 구현하지 않는다.** worker는 스케줄과 락만 담당하고 `application`의 서비스를 부른다.

```ts
// workers/counterfactual.worker.ts
cron.schedule('0 0 9 * * 1', () => recomputeInvoiceSnapshot.execute({ userId }));
```

같은 유스케이스를 HTTP와 스케줄러가 모두 부를 수 있어야 한다. 그게 `application`이 웹 DTO를 받지 않는 이유다.

## 7. 영속화

- PostgreSQL + Prisma. 스키마 변경은 **마이그레이션으로만**. 상세는 `prisma-database.md`, `performance-database.md`.
- **금액은 `Decimal`.** 신규 컬럼에 `Float`를 쓰지 않는다. 청구서 항등식 허용치가 100원이다.
