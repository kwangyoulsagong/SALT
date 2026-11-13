---
id: SRV-REQ-008
spec: ../../specs/in-progress/SRV-REQ-008-F000-FUNC.md
checklist: ../checklists/SRV-REQ-008.md
title: F000 FUNC — 관심 목록 · 보유 요약 · 초대 코드 · 온보딩 회고
status: 부분 완료
written: 2026-09-22 (backfill)
---

루트 회고: `requirements/reports/retrospects/F000-watchlist-tab.md`(PR #41) · `F000-invite-onboarding.md`(PR #42).
여기는 서버 쪽 교훈만 둔다.

## 1. 무엇을 했나

| PR (merge) | 서버 커밋 | FR |
|---|---|---|
| #41 (`3987cb2`) | `4f330c6` 관심 목록에 현재가 · 변동률 | FR-30 · FR-33 |
| | `545bda4` `period` 오타 · 모르는 값 422 | FR-50~52 |
| | `e43f619` 보유 평가 갱신 살림 · `GET /api/portfolio/summary` | FR-60 · FR-63 |
| | `2c76b4c` 주식에 업비트 로고 URL 을 붙이지 않음 | — |
| #42 (`658ed39`) | `be33196` `auth` 컨텍스트 · 초대 코드로만 계정 생성 (BREAKING) | FR-1~7 · FR-10~12 |
| | `9de46f4` `onboarding` 조합 컨텍스트 | FR-13 · FR-14(소스 대체) |

PR #43 · #44 · #47 에는 이 REQ 몫의 서버 변경이 없다(`a78ec49` 는 `SRV-REQ-006`, `4b72c9e` 는 `SRV-REQ-009`).

## 2. 잘 된 것

- **"`register` 를 만들지 않는다"(FR-5)를 구조로 만들었다.** 계정을 만드는 함수가 `InviteCodeStore.redeem` 하나이고
  코드 점유와 계정 생성이 한 트랜잭션이다. 실제 DB 동시 2요청 → 201 + 403(체크리스트 §5).
- **판정 순서가 보안이다.** `inviteAcceptance` 는 코드 상태를 상한보다 먼저 본다. 뒤집으면 무인증 `check` 로 정원을
  폴링할 수 있다(`be33196` 본문).
- **조합 컨텍스트 자리를 미리 등록해 둔 것이 쓰였다.** `onboarding` 은 `server-architecture.md` §2 에 이미 있었고,
  REQ 가 지정한 소스(`ledger` · `plan`)가 없어도 판정 규칙은 컨텍스트 안에 두고 조립 두 줄만 바꿔 끼웠다.
- **살린 경로의 비용을 같이 고쳤다.** `update-prices` 를 부르게 하면서 심볼마다 돌던 조회를 `findBySymbols` 1회로 —
  테스트 3건이 "심볼 100개여도 조회 1회"를 고정한다.

## 3. 틀렸던 것

셋 다 **소비처가 없어서 아무도 안 부르던 계약**이다(루트 회고 §3-bis).

| 결함 | 고친 커밋 |
|---|---|
| `ListWatchlist` 가 Prisma `Decimal` 을 그대로 내보내 JSON 문자열(`"158000000"`)이 됐다 | `4f330c6` |
| `/api/portfolio/internal/update-prices` 를 부르는 곳이 없어 `current_value` 가 생성 이후 0 | `e43f619` |
| 자산군과 무관하게 업비트 로고 URL 을 붙여 `logos/AAPL.png` 404 | `2c76b4c` |

> **Action:** `prisma-database.md` 의 "Decimal/Date 를 응답으로 보낼 때 직렬화 형태를 **확인한다**"는 확인만 요구한다.
> "`Decimal` 은 infrastructure 어댑터에서 `number | null` 로 바꾸고 `null` 을 0 으로 떨어뜨리지 않는다"로 행동을 적는다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| `set_plan` 소스가 `goal` 행 존재이고 **`composition.ts` 가 Prisma 로 직접 센다** | 체크리스트 §6. F003 `plan` 공개 API 가 서면 조립 두 줄 |
| FR-20~25 알림 · FR-32 `AssetType` · FR-61·62 환율(`null`) · FR-70~72 동면 | 체크리스트 §2 |
| 2026-09-21 추가 FR-80~104(추적 자산 · 뉴스 필드 · 목표 수량) | REQ Changelog. 미착수 |

## 5. 다음에 보완할 규칙 · 문서

- `ddd-shared.md` §2 의 `ErrorKind` 예시는 5값이다. 코드(`shared/domain/DomainError.ts`)에는 `be33196` 이 더한
  `Unauthenticated` 가 있다 — 규칙 문서가 값 추가를 따라가지 못했다.
- `composition.ts` 가 Prisma 를 직접 부르는 자리는 조립 지점 규칙(§5 "구현을 아는 유일한 자리")의 예외인지 임시인지
  한 줄 남긴다.

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

- 설정을 `env.ts` 에선 문자열로 받고 도메인 표(`KR_INDEX_NAMES`)로 거르는 것은 조립 지점에서 했다 — `shared` 가 `market` 을 모르게. Action 없음

## F011 슬라이스 6b (2026-10-27)

- 파일만 걸침 — 이 REQ 판단 없음

## 알림 1종 · 코드만 · 금액 없음 (2026-10-28)

- **관문을 둘 자리가 없어서 규칙이 한 달 "Must, 미구현"이었다.** 알림을 쓰는 곳이 코치 어댑터 하나였는데 테이블에 직접 썼다. 컨텍스트를 먼저 세우니 규칙 셋이 순수 함수 둘 · 테스트 9개로 끝났다
- **금액 금지를 "숫자 금지"로 바꿨다** — 키 이름만 보면 `note: "158000000"` 이 지나간다. 인자를 문자열로만 받고 숫자처럼 생긴 문자열도 막는다. BFF 가 같은 기준으로 한 번 더 거른다
- FR-21 "읽기 허용"과 F006 FR-94 "1종만"이 부딪혔다 — 행을 지우지 않는 것으로 읽고 REQ 에 적었다

Action: 없음(남은 F006 몫은 `SRV-REQ-028` Changelog 에)

## 2026-10-29 REQ 전수 조사

- 현재 상태를 말하는 문장이 뒤 슬라이스를 따라가지 못했다. Action: 슬라이스를 닫을 때 그 결과가 바꾸는 다른 REQ 의 본문 · 범위 밖 · 수용 기준을 grep 한다

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한

- 스펙의 "크립토만"(FR-87)이 Q2 결정으로 낡아 있었다 — 구현 전에 닫힌 결정부터 반영했다. Action: 열린 질문을 조건으로 건 FR 은 질문이 닫힐 때 그 FR 을 grep 해 개정한다
- 상한 판정에 잠금을 두지 않았다(최악 +1). 사용자 ≤ 10명 · 별 진행 중 비활성이라 비용이 더 크다. Action: 없음 — 판단 기록

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- 9월에 "필요해질 때 Port 와 함께 늘린다"고 적어 둔 그대로 한 줄씩 늘었다 — enum · Port · 클라이언트 · Swagger 가 한 커밋. 목록에만 넣고 빈 배열을 주는 길을 막아 둔 것이 이번에 그대로 효과가 있었다
- 코드 주석이 9월부터 FR 근거를 엉뚱한 REQ(`FE-REQ-010` 레이아웃 FR)로 적고 있었다. Action: 주석의 REQ 인용을 고칠 때 그 FR 문장을 열어 내용이 맞는지 본다

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- 참조 줄만. Action: 없음

## 2026-11-02 — 파일만 걸침

- 이 REQ 판단 무변경 — 기록만

## 2026-11-02 — 파일만 걸침 (해설 LLM 스위치)

- 기록만 — 이 REQ 판단 무변경

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 회고

비동기 감지를 조립에 넣을 때 조립을 async 로 바꾸지 않고 `useLocal()` 로 나중에 꽂았다 — 감지 전 요청은 Gemini(안전한 쪽).

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 파일만 걸쳤다 — 판단은 `FC-REQ-021` · `SRV-REQ-041` · `FE-REQ-046` 회고에 있다.

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 파일만 걸쳤다 — 판단은 `SRV-REQ-042` · `FE-REQ-050` 회고에 있다.

## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 이 REQ 화면 · 동작에 걸린 수정이 있다 — 근거와 확인은 커밋 설명 · 루트 회고 `requirements/reports/retrospects/MONEY-F1-invest-zone-home-cards.md`

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- 근거 · 판단은 루트 회고. Action 없음

## 2026-11-03 — 사용자 "그것도 다 니가해": launchd 상시 · 옛 Express goals 삭제

- launchd 아래 데스크탑 폴더 접근이 막히는 것은 새 실행 파일(java)마다 다시 생긴다 — 상시 프로세스가 읽는 산출물은 보호 폴더 밖에 둔다. Action 없음

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 파일만 걸침 — 이 REQ 를 머리 주석에 둔 파일을 S2c 가 고쳤다. 판단 · 실수는 루트 회고 `MONEY-S2c-notification`
- **Action**: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 조합 컨텍스트 `onboarding` 은 남의 사실(보유 · 목표)을 읽어 단계를 추측했다 — 사용자가 고른 것과 끝낸 때를 그대로 저장하는 쪽(identity)이 서비스 간 호출을 없앴다

## 2026-11-06 — F016 단계 A(파일 걸침)

- 주인은 F016 REQ — 이 문서는 파일이 걸쳐 기록만. 루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 2026-11-06 — F016 단계 B(파일 걸침)

- 이 REQ 몫 무변경. 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md`

## 2026-11-09 — F016 단계 C

- 변경 칸 하나 — 소비처 테스트(계약 목록 · 뷰모델)가 같이 고쳐졌다
- 루트 회고 `requirements/reports/retrospects/F016-C-move-split-facts.md`

## 2026-11-09 — 기사 본문

- 이 REQ 의 파일은 본문 경로를 잇는 자리만 바뀌었다(`schema.prisma` 에 `NewsArticleBody`(`news_article_body`). 판단 · 교훈은 주인 회고(`SRV-REQ-054` — 실측 먼저 · 영구 캐시엔 규칙 판 번호)

## 2026-11-10 — 검색 모달 2단계

- 파일만 걸침 — 판단은 `SRV-REQ-055` 회고
- 루트 회고 `requirements/reports/retrospects/FE-066-067-search-header.md`

## 2026-11-10 — F018

- F018 이 이 REQ 의 파일을 걸쳤다(위 체크리스트 2026-11-10 절). 국내 소유자 전용(F011 §정책)을 전제로 쓴 주석 · 단언이 여러 곳에 흩어져 있었다 — 전제가 바뀌면 그 문장을 grep 으로 한 번에 찾는다

## F017 v2 단계 1b — 2026-11-10

- 배운 것: 스키마 파일 한 줄이 이 REQ 에 걸린다 — 주인 REQ(`DB-REQ-017`)에 내용, 여기엔 기록만
- 액션: 없음

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

- 닿은 것: `schema.prisma` 에 `MarketUniverseSnapshot` · `PriceFillMark`(`DB-REQ-044`). 관심 추가는 5분봉 따라잡기 순서(보유 · 관심 먼저)에 반영 — FR-80~87 계약 변경 0
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-057` · `DB-REQ-044`

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

- 닿은 것: `schema.prisma` 에 모델 `TradeCheckLedgerEntry` → 표 `trade_check_ledger`(마이그레이션 `20261111130000_trade_check_ledger`, 추가만). 기존 모델 무변경
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-053` · BFF `BFF-REQ-052` · FE `FE-REQ-064`

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

- 액션: 없음

## F016 단계 D 짝(2026-11-12)

- 이 REQ 의 기능 변경은 없다 — 머리 주인인 공유 파일에 F016 단계 D(`SRV-REQ-052`)가 닿았다: `prisma/schema.prisma` 에 모델 `MoveExplanation` 하나 더함(주인 `DB-REQ-041` FR-8) — 기존 모델 변경 0
- 배운 것: 공유 파일을 바꾸면 그 파일 소비처를 grep 으로 전부 — 이번엔 소비처 변경 0

## F017 v4 순서 1b 짝 (2026-11-13)

- `investment.routes.ts` 코인 why-moved Swagger 에 `cause` · 코인 원인 순서
- 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage1-panel.md`
