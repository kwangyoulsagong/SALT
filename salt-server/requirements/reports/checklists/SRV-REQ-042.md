# SRV-REQ-042 — 국내 시장 요약 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `npm run build` · `lint` · `test:layer-check` | 통과 · 차단 10 · 통과 6 |
| `npm test` | **936 / 0** — 새 `krMarketSummary.test.ts` 12(칸 고르기 · 분위기 합 · 5분 칸 · 그린 날 · 소유자 404 · 칸 순서 · 태그 · 일정 3건 · 부분 실패 · 선 없는 칸 · 9칸 상한) · `krSupplement` 분 기록 정규장만 · `kisClient` 고가 · 저가 · 거래대금 단위 |
| Swagger | `swagger-jsdoc` `failOnErrors` — `/api/market/kr/summary` · `KrSummaryItem` 생성 확인 |
| 훅 사후 실행 | Python 으로 고친 서버 파일 전부 · 서버 · 프론트 훅 둘 다 exit 0 |
| 실서버(4000 재기동) | 소유자 200: 대표 코스피(고가 5907.21 · 저가 5616.5 · 거래대금 11.3조) · 코스닥 + 8종목(삼성전자 · SK하이닉스 · SK스퀘어 · 삼성전기 · LG에너지솔루션 · 삼성바이오로직스 · 현대차 · KB금융, 5분봉 각 57) · 분위기 1718 / 96 / 837 · 일정 3건(소비자물가 D-1 · 금통위 D-24 · 수출입 D-29) · `headlines: []` |
| 성능 | 30회 p50 15ms · p95 45ms · 최대 51ms(예산 100ms). 쿼리 8회 2파동 병렬 |
| 주문 · 계좌 TR | 0 — 새 KIS 호출 없음(지수 조회 TR 의 응답 필드를 더 읽을 뿐) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~FR-3 원/달러 칸~~ | **범위에서 뺌 2026-11-02**(사용자 결정 — 실전 키 안 씀, 모의 키는 환율 TR 거부) | 닫힘 |
| 첫날 대표 선 | ~~`degraded: true`~~ 14:35 대표 선 7점 · `degraded: false`. 하루치(09:00 ~ 15:30) 모양만 남음 — 분 기록이 배포 시각(14:06)부터 | 2026-11-03 장중 |
| 쿼리 수 4회(원 FR-8) | 유니버스 해석 3쿼리 — 줄이려면 수집 워커와 같은 캐시 | 사용자 수 · 지연이 예산에 닿을 때(지금 p95 45ms) |

## 미확인 항목 확인 (2026-11-02 14:35~ — 사용자 "확인안하거 다 해줘")

| 항목 | 결과 |
|---|---|
| 정리 실제 삭제 | 시험 행 둘(11일 전 · 9일 전) 넣고 `PruneKrIndexTicks` 실행 → `deleted: 1`(11일 전만) · 9일 전 남음(경계 맞음) · 오늘 행 60 그대로 · 9일 시험 행은 지움 |
| 비소유자 | 서버 · BFF `/kr/summary` 둘 다 404 `KR_STOCK_NOT_AVAILABLE` · 웹 3000: 국내 탭 0 · 국내 요약 요청 0 · 코인 띠 · 머리 띠 3칸 그대로 |
| 대표 선 · degraded | 14:35 대표 선 7점(5분 칸) · 선 없는 칸 0 · `degraded: false` |
| 지난 거래일 라벨 | `sessionWindow` 같은 날 "오늘 장중" · 10-31 "10/31 장중" |
| 실시간 | 장중 25초 종목 칸 8 중 5 갱신 |

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 조립 두 줄 · import 셋 삭제
- 검증: Express build · test
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 국내 요약 조립 줄은 그대로. 온보딩 조립 블록 · `createHttpClient` · `JwtUtil` import 제거(쓰는 곳 0)

## 2026-11-06 — F016 단계 A(파일 걸침)

- 변경 · 검증: 요약 응답 `marketActions` · 못 읽으면 빈 배열 + `degraded`(테스트 1). 실서버 요약 200
- 미검증 · 범위 밖: 없음
- 루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 2026-11-06 — F016 단계 B(파일 걸침)

- `composition.ts`(머리에 이 REQ) 에 등락 원천 저장소 · 광고성 패턴 조립(`SRV-REQ-051`). 요약 띠 무변경
- 검증: 영역 전체(서버 build · lint · test 981 · BFF test 421 · FE check-types · lint · test) 통과 — 체크리스트 `requirements/reports/checklists/F016-B-kr-news-flows.md`
- 미검증 · 범위 밖: 없음(이 REQ 몫 무변경)

## 2026-11-09 — F016 단계 C

| 항목 | 결과 |
|---|---|
| 조립 지점에 예측 뷰 어댑터 둘 · 카드 문턱 설정(F016 단계 C) — 요약 띠 무변경 | 반영 · 영역 검증 전체 통과 |

루트 체크리스트 `requirements/reports/checklists/F016-C-move-split-facts.md`

## 2026-11-09 — 기사 본문(주인 `SRV-REQ-054` · `BFF-REQ-053` · `FE-REQ-068`)

- `composition.ts` — news 본문 조립(포털 검색 · 페이지 · 캐시) · 국내에 `ArticleBodyAdapter` — 검증은 주인 체크리스트(서버 1031 · BFF 430 · 실화면 1440 · 훅 사후 실행)

## 2026-11-10 — F018 걸침

  - `salt-server/src/composition.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/application/__tests__/krMarketSummary.test.ts` — 테스트를 새 계약으로 — 비소유자 거절 단언을 "누구나 · 키 꺼짐만 숨김"으로

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 조립 파일 변경(요약 띠 무관) | 충족 | `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `composition.ts` — 수집 의존(`collection`) · KIS 동시 대기 상한 설정. 요약 띠 변경 0 · `npm test` 전체 · lint · build · 레이어 훅 사후(음성 대조 exit 2) |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `composition.ts` 에 `PrismaBaseRateReader` · `PrismaTradeCheckLedger` 연결. 기존 연결 무변경 · `npm run build` · `npm run lint` · `npm test` 1200 통과 · `npm run test:layer-check` · 레이어 훅 사후 실행(음성 대조 exit 2) · `prisma migrate diff` 0 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 조립 | 충족 | build · 실서버 기동 · 배치 회차 로그 |

## F017 v2 단계 4 등급 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 이 REQ 에 걸린 몫 | 반영 | `salt-server/src/composition.ts` — `judgmentTiers: new PrismaJudgmentTierReader()` 조립 한 줄. 주인 `SRV-REQ-053` FR-7 |
| 영역 검증 | 통과 | 서버 build · lint · test 1219 · test:layer-check / BFF test 449 · build / FE check-types · lint · test · test:layer-check / 예측 ruff · pyright · lint-imports · pytest · leakage |
| 이 REQ 의 기존 계약 | 변화 없음 | 칸을 더하기만 했다 — 지우거나 바꾼 필드 0 |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 조립 | 충족 | 빌드 · 서버 재시작 · `/health` 200 |
