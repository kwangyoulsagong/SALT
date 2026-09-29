# BFF-REQ-041 체크리스트 — 목표 비중 안내 중계 (F010 슬라이스 5)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 중계 | `services/app-target-weight.service.ts` · `rest/controllers/target-weight.controller.ts` · `rest/routes/coach.routes.ts` | 테스트: 경로 `/coach/target-weights` · 503 → `unavailable` · 행 배열 깨짐 → `unavailable` · 401 그대로 |
| FR-2 뷰모델 | `services/target-weight.viewmodel.ts` | 테스트: 금액 그대로 · 실패 사례 빈 배열 · 과거 성적 결측 · `backtest` 없음 → `disclosure_missing` · claims 문자열 → false · 깨진 행 3종 제외 · 남은 행 0 → `no_volatility` · `renderable: false` → blocked · `orderExecution: true` → 던짐 |
| FR-3 투자금 | `trade-risk.controller.ts` 허용 키 · `trade-risk.viewmodel.ts` `positive` | 테스트: 없음 → null · 20,000,000 · 0 → null |
| 실데이터 | 서버 유스케이스 실응답(로컬 DB)을 이 뷰모델에 통과 → 프론트 Playwright 고정 데이터 | 2행 · 고지 전부 통과(`blocked` 아님) |

## 검증

| 명령 | 결과 |
|---|---|
| `npm run build` | 통과 |
| `npm test` | 195 / 0(+7 — 이 REQ 테스트 파일) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실행 중 BFF 로 인증된 요청 | 로컬 토큰 발급 불가 | 로그인 QA(사용자) |
| 모바일 집계 1콜 | 모바일 앱 미착수 | F007 |

## FR-4~6 — target-weight@2 (2026-09-29)

| FR | 위치 | 결과 |
|---|---|---|
| FR-4 | `services/target-weight.viewmodel.ts` | 테스트: `no_room` · `gapCapped` · `no_record` · `outsideRuleWeight` 옮김 |
| FR-5 | 같은 파일 `toAltShare` | 테스트: 채택 없음 `null` 유지 · 후보 2 · 키 없는 기록은 `null` |
| FR-6 | 같은 파일 `toLive` · `liveComplete` | 테스트: 30주 `live` · 12주 · 낙폭 없음 · 실패 주 없음 → `backtest` · 서버 문턱 5 여도 30 · 서버 `backtest` 면 `backtest` |

- `npm test` 198 / 0 · `tsc --noEmit` · lint 통과. prettier 설정 없음(main 도 같은 파일이 걸린다) — 돌리지 않았다
- 미검증: 인증된 HTTP(로컬 토큰 없음) — 로그인 QA
