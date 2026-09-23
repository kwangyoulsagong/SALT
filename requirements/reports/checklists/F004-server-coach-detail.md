# F004 슬라이스 12 — 서버 코치 상세 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-server-coach-detail-slice.md` · 2026-09-23
브랜치: `feat/server-f004-coach-detail` (base `main` `67d1f31`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-025.md` §8 · `SRV-REQ-024.md`

## 요약

| 확인 | 결과 |
|---|---|
| 상세 유스케이스 · 실제 DB | **16ms** · 추천 `coach.sell` BTC `renderable: false` · `failure_cases_missing` · 성적 표본 1 `lowSample: true` · 후보 3 · 익절 계획 2 · `excluded` 국내 주식 |
| HTTP 무토큰 | 401 |
| 새 SQL | 없음 — 기존 Store · Probe 메서드만. `EXPLAIN` 대상 없음 |
| 금지 필드 | `targetPrice` · `expectedReturn` · `confidence` · `probability` 0건 (테스트) |
| 기존 경로 하위 호환 | `profit-plan` · `behavior-coach` 는 필드 추가만. 익절 계산 특성화 테스트 그대로 통과 |
| 게이트 | `npm run build` · `npm test` **299 pass**(+25) · `npm run lint` · `test:layer-check` · `layer-check` 사후 17파일 exit 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 블록 `renderable: true` 실측 | 실패사례 출처 테이블이 없다. 게이트 4종은 단위 테스트 | `DB-REQ-013` · `DB-REQ-019` |
| ~~인증된 HTTP 200~~ | — | **2026-09-23 닫힘** — BFF 슬라이스 14 에서 실제 로그인 토큰으로 BFF 경유 실측 |
| 매도 · 관망 추천의 적중 정의 | 기존 정의를 옮겨 썼다 — 매도 추천이 상승으로 "적중"한다 | PM |
| 후보 `reasons` | 저장되지 않는다 | `generate` 슬라이스 |
| `assetType: us_stock` | DB enum `stock` 하나 · 로컬에 주식 추천 없음 | `DB-REQ-003` |
| ~~BFF 전달~~ | — | **2026-09-23 닫힘** — BFF 슬라이스 14 |
