# F004 슬라이스 19 — 상세 차트 1주 탭 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| 서버 `week` (`SRV-REQ-008` FR-50) | `ChartPeriod.Week` · `UpbitClient.weeklyCandles`(`/candles/weeks`) · `GetChartData` | 실서버 `period=week&count=3` → `date` 10-26 · 10-19 · 10-12(월요일). 단위 테스트 주기 3종 → 호출 3종 |
| `month` 는 닫힘 (FR-51) | 열지 않음 | 서버 · BFF 둘 다 422 `MARKET_CHART_PERIOD_UNSUPPORTED` |
| Swagger (`SRV-REQ-009`) | `enum: [day, minute, week]` | `swagger-jsdoc` `failOnErrors` 생성 확인 |
| BFF 통과 (`BFF-REQ-007` FR-52 · `008` FR-12) | `CHART_PERIODS` 3종 | 실BFF(4001) `period=week` 200 · `month` 422. 미들웨어 테스트 2건 |
| FE 탭 6개 (`FE-REQ-026` FR-132) | `chartTimeframes.ts` `1w` · `ChartPeriod.Week` · 이름 "1주" | 3100 빌드본 1440 · 390(앱 웹뷰 UA) — 탭 6개 한 줄 · 요청 `period=week&unit=1&count=200` · 주봉 200개 · 날짜 축 · "실시간 아님" · 가로 스크롤 0 |
| 오버레이 (FR-27) | 기간 무관 | 임시 사용자 로그인 · 단타 · 장기 1주: 관찰 구간 띠 + 3선 + `예측 아님` |
| 실패 | 기존 분기 | route `period=week` 500 → "차트를 불러올 수 없습니다." · 1일 탭으로 복구 |
| 공통 수용 기준 | — | 주문 경로 0(Port 에 조회만) · 금액 계산 없음 · 새 문구 "1주" 하나(확신 · 명령형 0) |

## 수용 기준 · REQ 상태

- 개정한 FR 의 수용 기준에 `week` 줄을 더하고 체크 — `SRV-REQ-008` · `009` · `BFF-REQ-007` · `008` · `FE-REQ-012`. 실측: 서버 · BFF 각각 `minute` 200 · `miniute` 422 · `week` 200 · `month` 422
- 기존 `minute` · `miniute` 줄은 그대로 미체크 — 이 슬라이스가 고친 FR 이 아니다(F000 수용 기준 정리 몫)
- **done 이동 없음.** 건드린 REQ 전부 이 슬라이스 밖 남은 항목이 있다: F000 REQ(`SRV-008` · `009` · `BFF-007` · `008` · `FE-012`) — 410 로그 11-03 등 · `FE-REQ-026` — FR-70~72 피드백 화면 등 · `FE-REQ-034` · `029` — 첫 페인트 600ms(서버 차트 응답 요동) · PM 확인. 루트 슬라이스 문서만 `done/`

## 실데이터 (임시 사용자)

비밀번호를 아는 임시 사용자를 만들어 로그인 화면으로 로그인 → `/investments/BTC` 1주 확인 → 삭제. users 5 → 6 → 5.

## 검증 명령

| 명령 | 결과 |
|---|---|
| 서버 `npm test` · `build` · `eslint src/market` · `test:layer-check` | 858 통과 · 통과 · 0 · 차단 10 통과 6 |
| BFF `npm test` · `build` | 297 통과 · 통과 |
| FE `pnpm check-types` · `lint` · `test` · `test:layer-check` | 5/5 · 5/5(경고 0) · core 51 · ui 43 · 차단 8 통과 5 |
| `pnpm --filter web build` · `web-tax build` | 통과 · `/investments/[symbol]` 3.07 kB · 첫 로드 137 kB(슬라이스 16 과 같음) |
| 훅 사후 실행(셸로 쓴 파일) | FE 훅 12파일 · 서버 훅 6파일(정정 커밋 뒤 4파일 재실행) exit 0 |
| 정정 커밋(`36b09989`) 뒤 | 서버 `npm test` 858 · `build` · `eslint` 다시 통과 |
| Prisma | 스키마 무변경 — `prisma:generate` 해당 없음 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `month` 주기 | 소비 화면 없음 | 월봉 화면이 생길 때(`SRV-REQ-008` FR-50) |
| 국내 상세 1주 | 국내 차트는 DB 일봉 별도 경로 — 주봉 집계 필요 | `FE-REQ-049` FR-10 |
| RN 1주 탭 | 앱 미착수 | `RN-REQ-020` FR-105 |
| 200봉 이전 과거 이동 | 서버 `to` 파라미터 없음 | `FE-REQ-034` Open Questions 서버 후속 |
