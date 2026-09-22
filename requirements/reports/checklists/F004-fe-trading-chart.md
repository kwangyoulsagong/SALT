# F004 슬라이스 7 — 상세 분석 트레이딩 차트 (FE) — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-trading-chart-slice.md` · 2026-09-22
브랜치: `feat/fe-detail-trading-chart` (base `main` `8a83072`)
영역 체크리스트(본문 · 측정값 전체): `salt-microFe/requirements/reports/checklists/FE-REQ-034.md` · `FE-REQ-026.md` · `FE-REQ-029.md`

## 요약

| 확인 | 결과 |
|---|---|
| 상세 = `TradingChart` · 패널 = `PreviewChart` | pass |
| 포인터 이동 1회 스크립트(프로덕션, 200봉) | 0.66ms (전: SVG 60봉 0.81ms) · 기본 캔버스 다시 그리기 0 |
| 1000봉 다시 그리기 · 긴 작업 | 4.1ms · 0 |
| 번들 | 상세 전용 +7.8 KB gzip · 패널 +0.5 KB · 의존성 −1 |
| CLS · 메모리(20회 왕복) | 0.001 · 남은 캔버스 0 |
| 실시간 병합(프리뷰 포함) | 틱 73~85건에 봉 수 불변 |
| 시간대 | `America/New_York` 에서도 봉 시각 동일 |
| 게이트 | `check-types` · `lint`(monorepo) · ui vitest 43 · layer-check · web/web-tax 빌드 · storybook |

## 미검증 · 범위 밖

영역 체크리스트 `FE-REQ-034.md` §5 와 같다 — 첫 페인트(서버 응답), 과거 보기 중 새 봉(화면 미확인),
병합 · 파싱 상시 테스트(러너 없음 → 슬라이스 8 `FE-REQ-035` 에서 닫힘), 200봉 이전 · 주/월/년, 핀치, 이동평균 계산 위치(PM), 판단이 열린 화면(표본 0).
