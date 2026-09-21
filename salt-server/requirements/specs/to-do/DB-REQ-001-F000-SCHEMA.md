---
id: DB-REQ-001
feature: F000
area: db
kind: SCHEMA
title: "F000 정리·편집 — 스키마 정의 (죽은 모델 제거 · AssetType 3자산군 · InviteCode)"
priority: high
labels: [db, prisma, schema, cleanup]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md (FR-1, FR-34, FR-41, FR-44), FEATURE-005 (InviteCode), pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md
---

## Summary

신규 기능 4개가 올라갈 바닥을 고른다. 참조 0건인 모델 2개·enum 2개를 스키마에서 뺀다. `AssetType`을 3자산군으로 확장한다. 초대제 계정 생성을 위한 `InviteCode`를 신설한다. 화면이 없는 백엔드의 모델은 **보존한다.**

## Background

- `grep -rl "AIAnalysis" salt-server/src --include="*.ts"` = **0**. `AnalysisStatus`·`PredictionType`도 참조 0건이다. 스키마에만 남은 죽은 모델이다.
- `AssetType`이 `crypto | stock` 2값이다. 국내주식은 소액주주 양도차익 **비과세**이고 미국주식은 **22% + 결제일 기준 + 환율 환산**이다. 두 값을 하나로 묶으면 세금 엔진(F002)이 성립하지 않는다.
  - **개정 2026-09-21** — 세금 엔진(F002)이 `ADR-002` 로 빠져 이 근거가 사라졌다. 자산군 3종 유지 여부는 **열린 질문 Q2**(감사 문서 §3)다. 아래 FR-10~12 는 **Q2 결정 전 실행하지 않는다.**
- 계정 생성이 공개 `register`다. 글로벌 플랜 1-1절이 **비공개·초대제(본인 + 최대 10명)** 를 설계 제약으로 못 박았다.

## Schema — 제거

```prisma
// 삭제: model AIAnalysisSession   (User.analysisSessions 관계 필드 동반 제거)
// 삭제: model AIAnalysis          (User.aiAnalyses 관계 필드 동반 제거)
// 삭제: enum AnalysisStatus
// 삭제: enum PredictionType
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `AIAnalysisSession` 모델과 `User.analysisSessions` 관계 필드를 제거한다 | Must |
| FR-2 | `AIAnalysis` 모델과 `User.aiAnalyses` 관계 필드를 제거한다 | Must |
| FR-3 | `AnalysisStatus`, `PredictionType` enum을 제거한다 | Must |

## Schema — 자산군

```prisma
enum AssetType {
  crypto
  kr_stock
  us_stock
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `AssetType`을 `crypto`, `kr_stock`, `us_stock` 3값으로 정의한다. `stock`은 제거 대상이다(제거 시점은 DB-REQ-003). **개정 2026-09-21 — 보류(Q2)** | Must |
| FR-11 | `AssetType`을 참조하는 모델 7종이 3값을 받아들인다: `InvestmentWatchlist`, `PortfolioTransaction`, `PortfolioHolding`, `MarketAsset`, `PriceHistory`, `TechnicalIndicator`, `InvestmentInsight` | Must |
| FR-12 | `MarketAsset.assetType`의 `@default(crypto)`는 유지한다. 업비트 동기화 worker가 이 기본값에 의존한다 | Must |

## Schema — 초대 코드

```prisma
model InviteCode {
  id           String    @id @default(uuid())
  code         String    @unique
  issuedBy     String    @map("issued_by")          // 부트스트랩 코드는 "seed"
  usedByUserId String?   @map("used_by_user_id")
  usedAt       DateTime? @map("used_at")
  expiresAt    DateTime  @map("expires_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  usedBy User? @relation(fields: [usedByUserId], references: [id], onDelete: SetNull)

  @@index([usedByUserId])
  @@index([expiresAt])
  @@map("invite_codes")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 위 모델을 신설한다. `code`는 유일해야 한다 | Must |
| FR-21 | `usedByUserId`는 `onDelete: SetNull`이다. 계정이 지워져도 발급 이력은 남는다 | Must |
| FR-22 | 활성 계정 상한(10명)은 **DB 제약이 아니다.** 서비스 레이어가 검사한다(SRV-REQ-006 계열). DB는 코드 유일성과 사용 이력만 보장한다 | Must |
| FR-23 | `User`에 `inviteCodes InviteCode[]` 역참조를 추가한다 | Must |

## Schema — 목표 수량 (2026-09-21)

근거: `FEATURE-000` FR-44 · 감사 문서 B5. "BTC 1개 모으기"처럼 **수량 기준 목표**를 받는다. 목표 카드 시각은 바꾸지 않는다.

```prisma
model Goal {
  // ... 기존 필드
  targetAmount   Decimal?  @map("target_amount")                      // 금액 목표일 때만. 기존 NOT NULL 을 푼다
  targetQuantity Decimal?  @map("target_quantity") @db.Decimal(38, 18) // 수량 목표일 때만 (DB-REQ-002 FR-2)
  symbol         String?                                              // 수량 목표의 종목. 금액 목표면 null
}
// CHECK (migration SQL): (target_amount IS NULL) <> (target_quantity IS NULL)
//                        AND (target_quantity IS NULL) = (symbol IS NULL)
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `Goal.targetQuantity Decimal? @db.Decimal(38, 18)` 를 추가한다 (기본안 — 감사 문서 B5) | Should |
| FR-41 | `Goal.symbol String?` 를 추가한다. 수량 목표에서만 채운다 (기본안 — 감사 문서 B5) | Should |
| FR-42 | `targetAmount` 를 nullable 로 푼다. **금액 · 수량 중 정확히 하나**를 DB `CHECK` 로 강제한다. Prisma 가 CHECK 를 표현하지 못하므로 마이그레이션 SQL 에 쓴다 (기본안 — 감사 문서 B5) | Should |
| FR-43 | `currentAmount` 는 금액 목표 전용으로 둔다. **수량 목표의 현재 수량을 컬럼으로 저장하지 않는다** — 서버가 보유(`PortfolioHolding`)에서 계산한다(`SRV-REQ-008` FR-102). 두 곳에 두면 갈라진다 | Should |

## Schema — 추적 자산 · 뉴스 북마크 (2026-09-21)

근거: `FEATURE-000` FR-41 · FR-43 · 감사 문서 D8 · D5.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **추적 자산용 새 모델을 만들지 않는다.** 추적 자산 = `InvestmentWatchlist`(관심) ∪ `PortfolioHolding`(보유). 이미 `@@unique([userId, assetType, symbol])` 가 있다 | Must |
| FR-51 | 추적 상한(10)은 **DB 제약이 아니다.** 서비스가 설정값으로 검사한다(`SRV-REQ-008` FR-81). FR-22 와 같은 이유 — 상한이 바뀔 때 마이그레이션이 필요 없어야 한다 | Must |
| FR-52 | `MarketAsset.isTracked` 컬럼을 **만들지 않는다.** 스토리보드 `search` 가 그 이름을 썼지만 추적은 **사용자별**이라 전역 컬럼으로 표현할 수 없다. 응답 필드 `isTracked` 는 서버가 계산한다 | Must |
| FR-53 | `NewsBookmark` · `NewsArticle.sentiment` · `NewsArticle.symbols` 스키마를 **바꾸지 않는다.** 북마크 · 감정 배지 · 종목 연결이 기존 컬럼을 쓴다(FR-32 보존) | Must |

## Schema — 보존 (지우지 않는다)

| ID | 대상 | 근거 |
|---|---|---|
| FR-30 | `DailyMission`, `UserMissionProgress`, `UserAchievement`, `PointTransaction` | FEATURE-000 FR-10 "보류(동면)". route만 끄고 모델은 남긴다 |
| FR-31 | `MarketSentiment`, `WhaleTransaction`, `SentimentAlert`, `SmartMoneyAlert` | 프리뷰 화면이 `MarketSentiment`/`WhaleTransaction`을 계속 읽는다(변경 금지 목록) |
| FR-32 | `NewsArticle`, `NewsBookmark` | 뉴스 프리뷰 실데이터 연결(FE-REQ-007 계열)이 사용한다 |
| FR-33 | `Goal`, `SavingTransaction` | 홈 목표 진행 카드가 변경 금지 목록에 있다 |
| FR-34 | `User.totalPoints`, `User.userLevel` | 게이미피케이션 모델 보존 결정과 정합. FEATURE-005 초안의 "게이미피케이션 컬럼 drop"은 FEATURE-000 개정으로 **철회됐다** |
| FR-35 | `PortfolioTransaction`, `PortfolioHolding`, `PriceHistory` | 보유 기록 · 가격 이력. 어떤 마이그레이션에서도 row 손실 금지. **원장 확장은 하지 않는다**(ADR-002) |
| FR-36 | `ExecutionLog`, `InvestmentNotification`, `UserInvestmentProfile`, `InvestmentInsight`, `MarketAsset`, `TechnicalIndicator` | 현행 엔진이 사용 중 |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 하위호환 | enum 값 **추가**는 하위호환이다. 값 제거는 별도 릴리스(DB-REQ-003 5단계) |
| 코드 생성 | `npx prisma generate` 후 `npm run build`가 통과해야 한다. `AssetType` 리터럴 `"stock"`을 쓰는 서비스 코드가 있으면 이 REQ 범위에서 타입 에러로 드러난다 |
| 명명 | 기존 스키마의 `@map` snake_case 규칙을 따른다 |

## Acceptance Criteria

- [ ] `schema.prisma`에 `AIAnalysisSession`, `AIAnalysis`, `AnalysisStatus`, `PredictionType`이 없다
- [ ] `AssetType`이 `crypto`, `kr_stock`, `us_stock`를 포함한다
- [ ] `InviteCode` 모델이 있고 `code`가 `@unique`다
- [ ] `User`에 `analysisSessions`, `aiAnalyses` 관계 필드가 없고 `inviteCodes`가 있다
- [ ] 보존 대상 모델 16종이 스키마에 그대로 있다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과
- [ ] `Goal` 에 `targetQuantity` · `symbol` 이 있고, 금액 · 수량이 둘 다 있거나 둘 다 없는 row 를 넣으면 CHECK 위반이다
- [ ] 기존 `Goal` row 가 전부 `targetAmount` 를 갖고 `targetQuantity` 가 `null` 이다
- [ ] 추적 자산용 새 모델 · `MarketAsset.isTracked` 컬럼이 0건이다
- [ ] `NewsBookmark` · `NewsArticle` 스키마 diff 가 0이다

## Trace

| FR | 대상 | 검증 |
|---|---|---|
| FR-1~3 | `schema.prisma` | grep 0 (DB-REQ-002 FR-1이 게이트) |
| FR-10~12 | `AssetType` + 참조 7종 | `prisma validate` |
| FR-20~23 | `InviteCode`, `User` | 유니크 위반 테스트 |
| FR-30~36 | 보존 16종 | `\dt` 목록 diff |
| FR-40~43 | `Goal` | CHECK 위반 테스트 · 기존 row 분포 |
| FR-50~53 | 스키마 diff | 새 모델 0 · `isTracked` 0 |

## Dependencies

- 선행: 없음. **이 문서가 DB-REQ-004/013/016의 선행이다.** (개정 2026-09-21 — 007 · 010 은 ADR-002 로 삭제)
- 짝: `DB-REQ-002`(정책·불변식), `DB-REQ-003`(마이그레이션·백필·롤백)
- 소비: `SRV-REQ-006`(서버 정리)이 같은 릴리스에 나가야 한다 — **코드가 먼저, 스키마가 나중**

## Open Questions

- 현재 DB에 `asset_type = 'stock'` row가 실제로 몇 건인지. 0건이면 DB-REQ-003의 백필이 no-op이 된다. **마이그레이션 작성 전 실측 필요.**
- `InviteCode.issuedBy`를 `User.id` FK로 승격할지. 최초 코드는 발급자가 없다(부트스트랩) → 현재는 자유 문자열 + `"seed"` 리터럴.
- **Q2(감사 문서)** — `AssetType` 3값을 유지할지. 결정 전까지 FR-10~12 를 실행하지 않는다.
- 수량 목표에 `assetType` 도 둘지. `symbol` 만으로는 `crypto` 와 주식 심볼이 겹칠 수 있다 → **Q2 가 크립토만으로 닫히면 불필요**, 주식이 들어오면 `assetType` 컬럼을 같이 추가한다.
- `targetAmount` NOT NULL 해제가 기존 `goals.service` 의 `Decimal` 연산을 깨는지. 코드가 `null` 을 다루지 않으면 수량 목표 row 에서 터진다(`SRV-REQ-008` FR-100).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | **스토리보드 갭 감사 반영.** 추가: FR-40~43(목표 수량 — `targetQuantity` · `symbol` · `targetAmount` nullable + CHECK, 기본안 B5) · FR-50~53(추적 자산은 새 모델 없이 관심 ∪ 보유, `isTracked` 컬럼 없음, 뉴스 스키마 변경 없음 — D8 · D5). 개정: FR-10 과 Background 의 `AssetType` 근거 → **열린 질문 Q2**(ADR-002 로 세금 근거 소멸). 선행 목록에서 삭제된 DB-REQ-007 · 010 제거. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |
