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
