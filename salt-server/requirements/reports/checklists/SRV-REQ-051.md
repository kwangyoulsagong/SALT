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
