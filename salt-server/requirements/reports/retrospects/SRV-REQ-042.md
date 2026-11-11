# SRV-REQ-042 회고 (2026-11-02)

- 기본 칸 목록의 "원/달러"는 출처를 적지 않은 채 스펙에 들어갔다. 착수 첫 시간에 KIS 로 찔러 보고 모의 키 거부를 확인했다 — **칸마다 출처 TR · 테이블을 스펙에 같이 적는다.**
- FR-4(5분봉 대상에 넣기)는 유니버스 순서를 보니 이미 성립했다. 스펙이 "지금 일부 종목만" 이라고 쓴 전제를 코드로 먼저 확인했으면 FR 로 적지 않았을 것이다.
- 일정을 `headlines` 자리에 억지로 넣지 않고 `schedule` 필드로 둔 것이 BFF · 프론트를 단순하게 했다 — 같은 자리라도 모양이 다르면 필드를 나눈다.
- 쿼리 수 예산(4)은 유니버스 해석 비용을 몰랐다. 지연은 예산 안이라 정정만 했다.

- (후속) 원/달러를 "실전 키 또는 환율 소스 결정 때" 닫힌다고 적었는데, 실전 키를 쓰지 않는 건 이미 10-29 에 정해진 일이었다(메모 `kis-mock-key`). 막힌 이유가 이미 내려진 결정이면 '언제 닫히나'가 아니라 범위에서 뺀다.

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 파일만 걸침 — 이 REQ 를 머리 주석에 둔 파일을 S2c 가 고쳤다. 판단 · 실수는 루트 회고 `MONEY-S2c-notification`
- **Action**: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 없음

## 2026-11-06 — F016 단계 A(파일 걸침)

- 주인은 F016 REQ — 이 문서는 파일이 걸쳐 기록만. 루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 2026-11-06 — F016 단계 B(파일 걸침)

- 이 REQ 몫 무변경. 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md`

## 2026-11-09 — F016 단계 C

- 변경 칸 하나 — 소비처 테스트(계약 목록 · 뷰모델)가 같이 고쳐졌다
- 루트 회고 `requirements/reports/retrospects/F016-C-move-split-facts.md`

## 2026-11-09 — 기사 본문

- 이 REQ 의 파일은 본문 경로를 잇는 자리만 바뀌었다(`composition.ts`). 판단 · 교훈은 주인 회고(`SRV-REQ-054` — 실측 먼저 · 영구 캐시엔 규칙 판 번호)

## 2026-11-10 — F018

- F018 이 이 REQ 의 파일을 걸쳤다(위 체크리스트 2026-11-10 절). 국내 소유자 전용(F011 §정책)을 전제로 쓴 주석 · 단언이 여러 곳에 흩어져 있었다 — 전제가 바뀌면 그 문장을 grep 으로 한 번에 찾는다

## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

- 배운 것: 조립 파일이 이 REQ 를 머리에 가리켜 기록만 — 주인 표기가 넓다
- 액션: 없음

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

- 닿은 것: `composition.ts` — 수집 의존(`collection`) · KIS 동시 대기 상한 설정. 요약 띠 변경 0
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-057` · `DB-REQ-044`

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

- 닿은 것: `composition.ts` 에 `PrismaBaseRateReader` · `PrismaTradeCheckLedger` 연결. 기존 연결 무변경
- 문제 · 액션: 없음 — 주인 REQ 는 `SRV-REQ-053` · BFF `BFF-REQ-052` · FE `FE-REQ-064`

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

- 액션: 없음
