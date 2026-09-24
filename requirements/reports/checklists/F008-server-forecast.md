# SRV-REQ-037 F008 가격 변동 범위 API — 체크리스트 (17a-1, 2026-09-24)

| 확인 | 결과 |
|---|---|
| 실 DB — 소유자 · BTC | 1 · 2주 **켜짐**(기준가 115,650,000 · 90% 범위 107.1M ~ 125.4M / 102.7M ~ 128.9M), 3 · 4주 `miscalibrated`. 보유 0.05 BTC → 1주 평가금액 변화 −428,128 ~ +486,647원. `trackRecord.kind: backtest` · 표본 52 · 빗나간 사례 3 · 방향 필드 없음 |
| 실 DB — 비소유자 | `ForecastNotAvailableError` · `NOT_FOUND` → 404 |
| 뷰 조회 | 20회 평균 **5ms**(예산 50ms) |
| 테스트 | `npm test` **328 pass**(+10: 도메인 8 · 유스케이스 2) · `tsc --noEmit` · `npm run build` · eslint · `layer-check` 13파일 exit 0 |
| 금지 필드 | `targetPrice` · `expectedReturn` · `confidence` 0건(테스트) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실측(라우터 · 401 · 400) | 로컬 로그인 토큰 없이 유스케이스로 실측했다 | BFF 슬라이스 18 |
| 해설 검증기 · 템플릿 | 17a-2 | 다음 커밋 |
| `.env` 의 `FORECAST_OWNER_EMAILS` | 사용자 계정 이메일을 넣어야 화면에 나온다 | 사용자 설정 |
