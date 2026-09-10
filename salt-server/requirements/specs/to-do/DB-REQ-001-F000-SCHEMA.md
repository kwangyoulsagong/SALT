---
id: DB-REQ-001
feature: F000
area: db
kind: SCHEMA
title: "F000 정리·편집 — 스키마 정의 (죽은 모델 제거 · AssetType 3자산군 · InviteCode)"
priority: high
labels: [db, prisma, schema, cleanup]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md (FR-1, FR-34), FEATURE-005 (InviteCode)
---

## Summary

신규 기능 4개가 올라갈 바닥을 고른다. 참조 0건인 모델 2개·enum 2개를 스키마에서 뺀다. `AssetType`을 3자산군으로 확장한다. 초대제 계정 생성을 위한 `InviteCode`를 신설한다. 화면이 없는 백엔드의 모델은 **보존한다.**

## Background

- `grep -rl "AIAnalysis" salt-server/src --include="*.ts"` = **0**. `AnalysisStatus`·`PredictionType`도 참조 0건이다. 스키마에만 남은 죽은 모델이다.
- `AssetType`이 `crypto | stock` 2값이다. 국내주식은 소액주주 양도차익 **비과세**이고 미국주식은 **22% + 결제일 기준 + 환율 환산**이다. 두 값을 하나로 묶으면 세금 엔진(F002)이 성립하지 않는다.
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
| FR-10 | `AssetType`을 `crypto`, `kr_stock`, `us_stock` 3값으로 정의한다. `stock`은 제거 대상이다(제거 시점은 DB-REQ-003) | Must |
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

## Schema — 보존 (지우지 않는다)

| ID | 대상 | 근거 |
|---|---|---|
| FR-30 | `DailyMission`, `UserMissionProgress`, `UserAchievement`, `PointTransaction` | FEATURE-000 FR-10 "보류(동면)". route만 끄고 모델은 남긴다 |
| FR-31 | `MarketSentiment`, `WhaleTransaction`, `SentimentAlert`, `SmartMoneyAlert` | 프리뷰 화면이 `MarketSentiment`/`WhaleTransaction`을 계속 읽는다(변경 금지 목록) |
| FR-32 | `NewsArticle`, `NewsBookmark` | 뉴스 프리뷰 실데이터 연결(FE-REQ-007 계열)이 사용한다 |
| FR-33 | `Goal`, `SavingTransaction` | 홈 목표 진행 카드가 변경 금지 목록에 있다 |
| FR-34 | `User.totalPoints`, `User.userLevel` | 게이미피케이션 모델 보존 결정과 정합. FEATURE-005 초안의 "게이미피케이션 컬럼 drop"은 FEATURE-000 개정으로 **철회됐다** |
| FR-35 | `PortfolioTransaction`, `PortfolioHolding`, `PriceHistory` | 모든 신규 기능의 원장. 어떤 마이그레이션에서도 row 손실 금지 |
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

## Trace

| FR | 대상 | 검증 |
|---|---|---|
| FR-1~3 | `schema.prisma` | grep 0 (DB-REQ-002 FR-1이 게이트) |
| FR-10~12 | `AssetType` + 참조 7종 | `prisma validate` |
| FR-20~23 | `InviteCode`, `User` | 유니크 위반 테스트 |
| FR-30~36 | 보존 16종 | `\dt` 목록 diff |

## Dependencies

- 선행: 없음. **이 문서가 DB-REQ-004/007/010/013/016의 선행이다.**
- 짝: `DB-REQ-002`(정책·불변식), `DB-REQ-003`(마이그레이션·백필·롤백)
- 소비: `SRV-REQ-006`(서버 정리)이 같은 릴리스에 나가야 한다 — **코드가 먼저, 스키마가 나중**

## Open Questions

- 현재 DB에 `asset_type = 'stock'` row가 실제로 몇 건인지. 0건이면 DB-REQ-003의 백필이 no-op이 된다. **마이그레이션 작성 전 실측 필요.**
- `InviteCode.issuedBy`를 `User.id` FK로 승격할지. 최초 코드는 발급자가 없다(부트스트랩) → 현재는 자유 문자열 + `"seed"` 리터럴.
