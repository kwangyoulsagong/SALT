# F004 슬라이스 9 — 관찰 구간 차트 띠 · 상세 차트 버튼 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-zone-band-slice.md` · 2026-09-22
브랜치: `feat/fe-trading-chart-polish` (base `main` `68b1a64`)
영역 체크리스트(본문 · 측정값 전체): `salt-microFe/requirements/reports/checklists/FE-REQ-036.md`

## 요약

| 확인 | 결과 |
|---|---|
| 상세 `/investments/XRP` | 관찰 구간 띠 · 이름표 · 초록 선, 버튼 캡슐 |
| 패널 단타 · 장기 | 띠 · 이름표. 장기 구간에서 캔들 납작 없음 |
| 금지 문구 | 앱 0건 |
| 번들 | First Load 변화 0 · 상세 차트 청크 +0.9 KB · 패널 +0.4 KB(gzip) |
| 게이트 | `check-types` · `lint` · `pnpm test` · storybook · web/web-tax 빌드 · layer-check |

## 미검증 · 범위 밖

영역 체크리스트 `FE-REQ-036.md` §4 와 같다 — ▲▼ 이름표 실데이터, 375px, 중앙선 · 현재가 배지 겹침, 보유 종목 화면, ui 스토리 "목표가" 예시.
