---
id: SRV-REQ-007
area: srv
kind: ARCH
title: "서버 정리 — 삭제 5건 · 동면 4건 (grep 근거 첨부)"
priority: high
labels: [cleanup, deletion, dormant, 410-gone, migration]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md (A절 FR-1~5, B절 FR-10~14)
---

## Summary

**화면 밖 죽은 코드만 삭제한다.** 화면이 없는 백엔드는 **지우지 않고 동면**시킨다 — route만 끄고 코드와 모델은 남긴다. 되살리는 비용이 커밋 하나여야 한다.

## 왜 "삭제"가 아니라 "정리"인가

초기 판단은 "다 만들어놓고 안 쓰니 절반을 지우자"였다. **사용자가 되돌렸다** — *"사실 지금 있는 거 다 필요해 보이긴 해"*. 실제 코드를 읽어보니 그 판단이 타당하다:

- `/investments`는 실시간 가격·5분봉·심리 온도계·스마트 머니가 **동작**하고 변동률 blink 2초 같은 디테일까지 들어가 있다.
- `ai-coach` 점수 엔진 + Gemini explainer, `signal-performance`, `profit-plan`, `trade-preflight`, `behavior-coach`는 **제품의 핵심 엔진**이고 화면만 없다(F004가 그걸 화면으로 만든다).

문제는 기능 과잉이 아니라 **(a) 참조가 0인 죽은 코드와 (b) 쓰지 않는데 켜져 있는 route**다. 전자는 삭제, 후자는 동면이다.

## 삭제 — 참조 0건을 확인한 것만

### 근거 (2026-09-09 실측)

```
$ grep -rl "AIAnalysis" salt-server/src --include="*.ts"
(0 files)

$ grep -rn "AnalysisStatus\|PredictionType" salt-server/src bff/src --include="*.ts"
(no matches)

$ git ls-files 'salt-server/src/**/*.js' 'salt-server/src/**/*.d.ts' 'salt-server/src/**/*.js.map' | wc -l
24

$ grep -rn "ACCOUNT_SELECTED" salt-microFe/apps salt-microFe/packages --include="*.ts" --include="*.tsx"
(no matches)   ← 이미 제거되어 있다
```

| ID | 삭제 대상 | 근거 | 우선순위 |
|---|---|---|---|
| FR-1 | Prisma 모델 `AIAnalysisSession` · `AIAnalysis`, enum `AnalysisStatus` · `PredictionType` | 서버 코드 참조 **0건** | Must |
| FR-2 | `src/workers/market-price-updater.worker.ts` | 가격 갱신은 BFF `price-updater.worker`가 한다. **서버에도 있어 이중 갱신**이다. `app.ts`에서 `marketPriceUpdater.start()` 제거 | Must |
| FR-3 | 커밋된 빌드 산출물 **24개 파일** (`src/**/*.js`, `*.d.ts`, `*.js.map`) + `.gitignore` 반영 | 소스 트리에 컴파일 결과가 추적되고 있다. `src/config/database.js` 등이 `.ts`와 공존해 어느 것이 진실인지 모호하다 | Must |
| FR-4 | `packages/message-event-bus`의 `ACCOUNT_SELECTED` | **이미 코드에 없다.** 이 항목은 확인만 하고 닫는다. 은행/계좌 API가 없어 동작 근거가 없었다 | Must |
| FR-5 | 기획 문서에서 랭킹·이달의 저축왕·소셜 저축·저축 게임 내리기 | 코드에 없고 사용자 ≤10명이면 성립하지 않는다. `README.md`를 v1/v2 2섹션으로 개편(**삭제 아님**) | Should |

### FR-1 실행 순서 — 코드가 먼저, 스키마가 나중

Prisma 모델 삭제는 `DB-REQ-003` M4가 한다. **이 REQ는 `User`의 관계 필드(`analysisSessions` · `aiAnalyses`) 제거와 grep 재확인까지만** 하고, 마이그레이션은 DB REQ가 실행한다. 순서를 뒤집으면 빌드가 깨진다.

## 동면 — 지우지 않고 끈다

**화면이 없는 백엔드를 삭제하지 않는다.** 지인이 늘거나 필요해지면 다시 켠다. 되살리는 비용이 커밋 하나여야 한다.

| ID | 동면 대상 | 끄는 것 | 남기는 것 | 우선순위 |
|---|---|---|---|---|
| FR-10 | 미션/포인트/업적 | `app.use("/api/missions")` 등록 해제 + `modules/user`의 points·achievements 핸들러 route 해제 + BFF proxy 제거 | **`modules/mission/**` 코드 전부** · Prisma `DailyMission`·`UserMissionProgress`·`UserAchievement`·`PointTransaction` · `User.totalPoints`·`User.userLevel` | Must |
| FR-11 | 알림 파이프라인 축소 | `SentimentAlert`/`SmartMoneyAlert` **생성** worker 중단. `InvestmentNotification.type`을 **세금 D-Day + 지표/추천 갱신 2종**으로 제한 | `MarketSentiment`·`WhaleTransaction` 모델과 **프리뷰 조회 경로**(심리 온도계·스마트 머니 게이지가 계속 읽는다) | Must |
| FR-12 | 인사이트 랭킹·피드 | `insight-ranking.controller` route 해제 · `app.use("/api/feed")` 해제 · BFF `app-feed.service` route 제거 | 코드·모델 전부 | Should |
| FR-13 | 대시보드 | `app.use("/api/dashboard")` 해제. 홈 aggregation은 BFF `homeBlocks`가 담당한다 | `modules/dashboard/**` 코드 | Should |
| FR-14 | 동면 route 응답 | 404가 아니라 **410 Gone + 1회 로그**로 **1주 유지**해 프론트 잔여 호출을 탐지한다 | — | Should |

### 동면이 삭제가 아니라는 것을 무엇으로 증명하는가

- Prisma 모델이 `\dt`에 남아 있다
- 코드 파일이 `src/`에 남아 있다
- **되살리기 테스트를 1회 수행한다**: 동면 route 하나를 재등록해 200이 나오는 것을 확인하고 되돌린다

## 유지 — 손대지 않는 것

| 대상 | 근거 |
|---|---|
| `ai-coach` 점수 엔진 + Gemini explainer · `signal-performance` · `profit-plan` · `trade-preflight` · `behavior-coach` | 제품의 핵심 엔진. F004가 화면으로 만든다 |
| `modules/market-intelligence` | 프리뷰 화면이 사용 중. **알림 생성만** 중단 |
| `modules/investment` (watchlist) | 관심 종목 탭이 사용 (F000 수리 대상) |
| `modules/news` | 뉴스 프리뷰 실데이터 연결이 사용 |
| `modules/portfolio` · `technical-indicator` | 신규 기능 전부의 입력 |
| `PortfolioTransaction` · `PortfolioHolding` · `PriceHistory` | 모든 신규 기능의 원장. **row 수 보존이 수용 기준** |
| worker: `market-sync` · `price-history` · `technical-indicator` · `investment-insight` · `news-crawler` · `notification-cleanup` | 전부 유지. `news-crawler`는 뉴스 실데이터가 필요하므로, `notification-cleanup`은 알림 2종에도 필요하므로 |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 되돌리기 | 브랜치 + FR 단위 커밋. FR-1 실행 전 `pg_dump -Fc` 스냅샷 + 복원 테스트 1회 |
| 데이터 안전 | 원장 3종 row 수가 전후 동일 |
| 성능 | 정리 후 `npm run build` 시간과 기동 worker 수를 측정해 기록. worker 1개 감소로 DB 커넥션 상시 사용량이 줄어야 한다 |
| 관측성 | 410 응답 1회 로그. 1주 후 잔여 호출 0건 확인 |
| 순서 | **프론트 → BFF → 서버 → Prisma.** 역순이면 빌드가 계속 깨진다 |

## Acceptance Criteria

- [ ] `grep -rn "AIAnalysis\|AnalysisStatus\|PredictionType" salt-server/src bff/src --include="*.ts"` = 0
- [ ] `User`에 `analysisSessions` · `aiAnalyses` 관계 필드가 없다
- [ ] `src/workers/market-price-updater.worker.ts`가 없고 `app.ts`에 `marketPriceUpdater` 참조가 없다
- [ ] `git ls-files 'salt-server/src/**/*.js' 'salt-server/src/**/*.d.ts' 'salt-server/src/**/*.js.map'` = 0
- [ ] `.gitignore`에 빌드 산출물 패턴이 있다
- [ ] `grep -rn "ACCOUNT_SELECTED" salt-microFe` = 0 (확인)
- [ ] `README.md`가 v1/v2 2섹션 구조이고 랭킹·저축왕·소셜·게임이 v2로 내려가 있다
- [ ] `app.ts`에 `/api/missions` · `/api/feed` · `/api/dashboard` 등록이 없다
- [ ] 동면 경로 요청이 **410 Gone**을 반환하고 1회 로그를 남긴다
- [ ] **동면 모듈의 코드 파일이 `src/`에 그대로 있다** (`modules/mission` · `modules/feed` · `modules/dashboard`)
- [ ] **Prisma 미션/포인트/업적/센티먼트/고래 모델 8종이 `\dt`에 있다**
- [ ] `User.totalPoints` · `User.userLevel` 컬럼이 있다
- [ ] `SentimentAlert`/`SmartMoneyAlert` **생성** 코드가 실행되지 않는다 (worker 중단 확인)
- [ ] `MarketSentiment`/`WhaleTransaction` **조회** 경로가 동작한다 (프리뷰 화면 확인)
- [ ] `InvestmentNotification.type` 생성 값이 2종뿐이다
- [ ] 되살리기 테스트 1회 통과 (route 재등록 → 200 → 되돌림)
- [ ] 원장 3종 row 수가 전후 동일하다
- [ ] `npm run build` 통과. 빌드 시간·기동 worker 수 기록

## Trace

| FR | 대상 | 검증 |
|---|---|---|
| FR-1 | `User` 관계 필드, `DB-REQ-003` M4 | grep 0 + `\dt` |
| FR-2 | `workers/`, `app.ts` | 기동 로그의 worker 목록 |
| FR-3 | git 추적 파일 | `git ls-files` = 0 |
| FR-4 | `message-event-bus` | grep 0 (확인만) |
| FR-5 | `README.md` | 2섹션 구조 |
| FR-10~13 | `app.ts` 등록 해제 · BFF proxy | 410 응답 + 코드·모델 존재 |
| FR-14 | 410 핸들러 | 1주 로그에 잔여 호출 0건 |

## Dependencies

- **선행:** 프론트·BFF에서 해당 경로 호출 제거 (`FE-REQ-013`, `BFF-REQ-009` 계열)
- **후속:** `DB-REQ-003` M4(모델 drop) — **이 REQ가 먼저 배포되어야 안전하다**
- **무관:** `SRV-REQ-006`(DDD 전환)과 병렬 가능. 동면 모듈은 DDD로 옮기지 않는다(`SRV-REQ-006` FR-34)

## Open Questions

- 410을 1주 유지한 뒤 무엇으로 바꿀지. 404가 기본이지만, **되살릴 가능성이 있는 경로**라면 410을 유지하는 것도 근거가 있다.
- `modules/dashboard` 삭제 여부. 홈 aggregation이 BFF로 완전히 넘어간 뒤 판단한다. **지금은 동면.**
- `InvestmentNotification.type`을 2종으로 제한할 때 기존 row의 다른 타입을 어떻게 할지. **읽기는 허용하고 생성만 막는 것**이 기본안.
