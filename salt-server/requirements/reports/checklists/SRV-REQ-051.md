# SRV-REQ-051 — 체크리스트

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06) — FR-2 · FR-3(추정) · FR-6

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-2 VI 현황 · 장중 1분 · (종목, 발동 시각) 한 행 | `KisClient.viEventsPage` · `PollKrViEvents` · `PrismaKrMarketStatusStore.upsertViEvents` | 실호출(모의 키) 30행 · 해제 22 · 중복 0(PK) · 해석 테스트(실측 응답 행) · 쪽 넘기기 멈춤 표 테스트 |
| FR-3 서킷브레이커 추정 | `detectKrCircuitBreakers` · `InferKrMarketActions` | 경계 표 9 + 2026-11-06 실제 분 기록 재생(09:04~09:34) · 배포 직후 실서버 같은 행 |
| FR-3 사이드카 · 장운영정보 실시간 | — | **미검증 · 범위 밖**(아래) |
| FR-6 상태 칸 · 마지막 체결 | `KrStockQuoteFact` 칸 다섯 · `krStatusBadges` · `krVisibleLastTrade` · 저장 두 문장 | 칩 표 테스트 · 실서버 56행 중 50행 `last_trade_at` |
| 허용 목록 TR · 주문 · 계좌 0 | `KIS_QUERY_TR.viStatus` | `kisClient.test.ts` 허용 목록 · 레포 grep 테스트 통과 |
| 교차 스키마 조인 0 · 이전 막는 의존 0 | 새 표 market 소유 · 새 컨텍스트 import 0 | `npm run lint` · `test:layer-check` |

- `npm run build` · `lint` · `test` 957/0 · `test:layer-check` 통과 · `prisma migrate deploy`(로컬) · `ops/salt.sh restart server`
- 수용 기준 "KIS 처리량 악화 0": 새 호출은 분당 1건(VI) — 장중 지연 측정은 하지 않았다(아래)

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 장운영정보 실시간 필드 · 사이드카 | 발동일에만 값이 보인다(오늘 발동은 끝났다) — 추정으로 대신 | 다음 서킷브레이커 · 사이드카 발동일 |
| VI 1분 30건 초과 회차 | KIS 가 최근 30건만 준다(실측) — 그 앞쪽 종류 · 시각은 놓친다. 칩은 현재가 칸으로 선다 | 단계 B 에서 종목별 조회 필요성 판단(관측 로그로 초과 회차 수를 먼저 센다) |
| 처리량 악화 측정(장중 10분 창 초과율 전후) | 이번 회차에 재지 않았다 — 추가 호출 분당 1건 | 단계 B(수집 셋이 더 붙는 때 한 번에 측정) |
| FR-1 · 4 · 5 · 7~10 · 12 | 단계 B~D | `F016-why-moved-global-plan.md` |

## 단계 B(2026-11-06) — FR-1 · FR-4 · FR-5(프로그램) · FR-12 · 보존

루트 슬라이스 `requirements/specs/done/F016-B-kr-news-flows-slice.md` · 체크리스트 `requirements/reports/checklists/F016-B-kr-news-flows.md`

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-1 시황/공시 제목 · 광고성 · 30일 | `KisClient.newsTitlesPage` · `PollKrNewsTitles` · `PrismaKrMoveSourceStore.saveNewsTitles` | 모의 키 실호출(시장 전체 40건/쪽 · 시각 쪽 넘김) · 재기동 뒤 15분 47건 · 중복 0(PK) · 해석 테스트(실측 행) · 쪽 넘김 멈춤 표 테스트 6 |
| FR-4 업종 지수 | `PollKrSectorIndices`(지수 TR 재사용) | 업종 8개(5분 cron) · 코드 판정 경계 표 9 · 15:40 · 창 밖 테스트 |
| FR-5 장중 프로그램 | `KisClient.programFlow` · `PollKrProgramFlows` | 13:20 회차 49/50(초과 고친 뒤) → 13:30 이후 50/50 · SK하이닉스 13:20 −411,418주 · −4,655억 · 금액 단위(원) 실측 행 테스트 · 어제 행 버림 · 한도 양보 |
| FR-5 외국인 · 기관 장중 | — | **미검증 · 범위 밖**(아래) |
| FR-12 신선도 | `ops/salt.sh status` 세 줄 | 실행 확인 |
| 읽기 둘 · 소유자 전용 | `GetKrStockNews` · `GetKrIntradayFlows` · Swagger | 소유자 토큰 200 · 비소유자 404 테스트 · EXPLAIN 인덱스 |
| 허용 목록 TR | `newsTitle` · `programTrade` | `kisClient.test.ts` · 레포 grep 테스트 |
| 기사 본문 · 링크 0 | 표 · 응답 · 파서 | 스키마 · 해석 테스트 키 목록 |

- `npm run build` · `lint` · `test` 981/0 · `test:layer-check` · `prisma migrate deploy`(로컬) · `ops/salt.sh restart server`
- KIS 처리량: 실시간 종목 무관 · 폴링 9종목이 프로그램 회차 분에 한 번 약 1분 더 묵음(루트 체크리스트 §4)
- **결함 1** — 시세 사슬 끝 "10분 정각" 판정이 늦게 시작한 12:00 회차를 0행으로 버림 → 각자 cron(`158d5940`)
- **결함 2** — 초과 한 건에 회차를 접어 13:10 회차 0/50 → 연속 셋일 때만 양보 · 13:20 회차 49/50(`13b5784e`)

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 외국인 · 기관 장중 추정 | `FHPTJ04160001` 모의 키 거부(`OPSQ2001`) | 실전 키 전환 시 |
| 광고성 패턴 정확도 | 첫날 47건에 걸린 것 0 — 표본이 작다 | 2026-11-13 1주 표본 |
| 배포 당일 오전 소식 | 첫 수집은 한 쪽(그 앞을 거슬러 받지 않는다) — 영향은 배포 첫날뿐 | 닫지 않음(설계) |
| 장운영정보 실시간 · 사이드카 · VI 30건 초과 | 단계 A 표 그대로 | 다음 발동일 |
| FR-7~10 | 단계 C | `F016-why-moved-global-plan.md` |
