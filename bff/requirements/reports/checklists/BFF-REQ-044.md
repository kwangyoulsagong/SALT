# BFF-REQ-044 — 국내 요약 띠 중계 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `npm run build` | 통과 |
| `npm test` | **315 / 0** — 새 `kr-market-summary.viewmodel.test.ts` 5(이름 · 금액 그대로 · 모르는 태그 · 일정 버림 · 점 하나 선 null · 없는 고가 null · degraded 유지 · 분위기 0 → null · 계약 깨짐 3) · `app-kr-stock.test.ts` 경로 · 404 올림 · 503 → disabled |
| 실 BFF(4001 재기동) | 소유자 200 · 94ms · `status: ok` · 칸 순서 코스닥 → 종목 · 일정 1건째 `kr_cpi` · 비로그인 401 |
| 캐시 | 없음(소유자 판정 응답) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱(RN) 소비 | 모바일 화면 없음 | F007 |
