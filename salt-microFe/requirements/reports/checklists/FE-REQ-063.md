# FE-REQ-063 — 체크리스트

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06) — FR-2 · 3

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-2 시장 띠 | `KrMarketActionBanner` — 요약 띠 위 · 상세 머리 | 실화면(소유자 토큰 · 셸 3001): 오늘 실제 기록 "오늘 코스피 서킷브레이커 1단계 · 09:04~09:34 매매 정지 · 추정" 요약 · 상세 둘 다 · `route` 로 진행 중 "… · 09:04부터 · 재개 예정 09:24 · 추정" |
| FR-3 칩 · 마지막 체결 | `KrQuoteBadges` · 상세 정지 줄 | `route` 로 VI · 시각 → "VI 발동(정적)" 칩 · "VI 단일가 매매 중 · 마지막 체결 09:03:32" |
| 390 웹뷰 · 넘침 | — | 앱 웹뷰 UA 390 상세 넘침 0 · 1280 요약 · 상세 넘침 0 |
| axe 새 요소 0 | 띠 · VI 칩만 넣어 돌림 | 위반 0(페이지 전체 대비 위반은 기존 것) |
| 문구 — 인과 · 앞날 · 매매 지시 0 · 해요체 | `krStockMessages` `marketAction` · `vi` · `detail.stopped` | 문구 확인 |
| 값 · 보일지 서버 | `active` · `resumesAt` · `lastTradeAt` 전부 서버 | 코드 확인(프론트 판정 0) |

- `pnpm check-types` · `lint` · `test`(core 184 · ui 46) · 레이어 훅 사후(바꾼 파일 9) 통과

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-1 · 4 · 5 · 6 · FR-8 의 카드 상태 | 단계 B~D | 전 영역 계획 |
